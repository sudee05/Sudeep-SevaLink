const http = require('http');
const fs = require('fs');
const path = require('path');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch {
  createClient = require(path.join(
    __dirname,
    '../../../website/node_modules/@supabase/supabase-js'
  )).createClient;
}

/* ------------------------------------------------------------------ */
/* env                                                                  */
/* ------------------------------------------------------------------ */

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/\r$/, '')
        .replace(/^["'](.*)["']$/, '$1');
      if (key) process.env[key] = value;
    });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://giygtxqatkrgjeuojgma.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const WHATSAPP_ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sevalink_whatsapp_secret_sudeep';
const PORT = Number(process.env.PORT || 3001);

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase key. Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to supabase/functions/.env.'
  );
}
if (!WHATSAPP_PHONE_ID) {
  console.warn('WARNING: WHATSAPP_PHONE_NUMBER_ID is not set in .env — outbound sends will fail.');
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const cryptoLib = require('crypto');

/* ------------------------------------------------------------------ */
/* outbound: text / list / buttons                                     */
/* ------------------------------------------------------------------ */

async function callMeta(payload) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log('\n[MOCK OUTBOUND]', JSON.stringify(payload, null, 2), '\n');
    return { mock: true };
  }
  const url = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[Meta send FAILED ${res.status}]`, JSON.stringify(data));
      return { error: data?.error };
    }
    console.log('[Meta send ok]', data?.messages?.[0]?.id || '');
    return data;
  } catch (err) {
    console.error('[Meta fetch error]', err.message);
    return { error: err.message };
  }
}

function sendText(to, body) {
  return callMeta({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
}

// items: [{ id, title, description }]  — max 10 rows total, title max 24 chars, description max 72 chars
function sendList(to, bodyText, buttonLabel, items, sectionTitle) {
  const rows = items.slice(0, 10).map((item) => ({
    id: item.id,
    title: String(item.title).slice(0, 24),
    description: item.description ? String(item.description).slice(0, 72) : undefined,
  }));
  return callMeta({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{ title: (sectionTitle || 'Options').slice(0, 24), rows }],
      },
    },
  });
}

// buttons: [{ id, title }] — max 3, title max 20 chars
function sendButtons(to, bodyText, buttons) {
  return callMeta({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: String(b.title).slice(0, 20) },
        })),
      },
    },
  });
}

// Sends a list, and also numbers the items in the body text so a plain
// numeric reply ("2") works as a fallback if the client can't render lists.
function numberedBody(bodyText, items) {
  const lines = items.map((item, i) => `${i + 1}. ${item.title}`);
  return `${bodyText}\n\n${lines.join('\n')}`;
}

/* ------------------------------------------------------------------ */
/* session store                                                       */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 60 * 60 * 1000;
const sessions = new Map();
const seenMessageIds = new Set();

function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing && Date.now() - existing.updatedAt < SESSION_TTL_MS) return existing;
  const fresh = { step: 'init', profile: null, draft: {}, updatedAt: Date.now() };
  sessions.set(phone, fresh);
  return fresh;
}
function saveSession(phone, session) {
  session.updatedAt = Date.now();
  sessions.set(phone, session);
}
setInterval(() => {
  const now = Date.now();
  for (const [phone, s] of sessions) if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(phone);
  if (seenMessageIds.size > 2000) seenMessageIds.clear();
}, 10 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* data access                                                         */
/* ------------------------------------------------------------------ */

async function findProfileByPhone(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, '');
  const formatted = `+${digits}`;
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role, approval_status')
    .or(`phone.eq.${formatted},phone.eq.${digits}`)
    .limit(1)
    .maybeSingle();
  if (error) console.warn('[findProfileByPhone]', error.message);
  return data || null;
}

async function createProfile({ phone, name, email }) {
  const digits = String(phone).replace(/\D/g, '');
  const formatted = `+${digits}`;

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    phone: formatted,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: name, source: 'whatsapp' },
  });
  if (authError) console.warn('[createUser]', authError.message);

  const userId = authUser?.user?.id || cryptoLib.randomUUID();

  const { data: profile, error: upsertError } = await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      full_name: name,
      phone: formatted,
      role: 'customer',
      approval_status: 'approved',
    })
    .select('id, full_name, phone, role, approval_status')
    .single();
  if (upsertError) console.warn('[profiles upsert]', upsertError.message);

  return profile || { id: userId, full_name: name, phone: formatted };
}

async function fetchCategories() {
  const { data, error } = await adminClient
    .from('categories')
    .select('id, name, description')
    .order('name')
    .limit(9);
  if (error) console.warn('[fetchCategories]', error.message);
  return data || [];
}

async function fetchServices(categoryId) {
  const { data, error } = await adminClient
    .from('services')
    .select('id, name, description')
    .eq('category_id', categoryId)
    .order('name')
    .limit(9);
  if (error) console.warn('[fetchServices]', error.message);
  return data || [];
}

async function fetchProviders(serviceId) {
  const { data, error } = await adminClient
    .from('provider_services')
    .select('price, provider_id, providers!inner(id, business_name, rating, experience, about, verified, status, certificates)')
    .eq('service_id', serviceId)
    .eq('providers.status', 'approved')
    .limit(9);

  if (error) {
    console.warn('[fetchProviders] query error:', error.message);
    return [];
  }

  if (data.length === 0) {
    // Nothing matched with the approved-only filter. Re-run without the
    // status filter to tell us whether the data exists but is unapproved,
    // or whether there's no provider_services link at all for this service.
    const { data: unfiltered, error: rawError } = await adminClient
      .from('provider_services')
      .select('provider_id, providers(business_name, status)')
      .eq('service_id', serviceId);

    if (rawError) {
      console.warn('[fetchProviders] diagnostic query error:', rawError.message);
    } else if (!unfiltered || unfiltered.length === 0) {
      console.warn(
        `[fetchProviders] No rows in provider_services for service_id=${serviceId}. ` +
          `No provider has been linked to this service yet.`
      );
    } else {
      const statuses = unfiltered.map((r) => `${r.providers?.business_name || r.provider_id}: ${r.providers?.status}`);
      console.warn(
        `[fetchProviders] service_id=${serviceId} has ${unfiltered.length} provider(s) linked, ` +
          `but none have status='approved'. Statuses found: ${statuses.join(', ')}`
      );
    }
    return [];
  }

  return data.map((row) => ({
    providerId: row.provider_id,
    price: row.price,
    businessName: row.providers.business_name,
    rating: row.providers.rating,
    experience: row.providers.experience,
    about: row.providers.about,
    verified: row.providers.verified,
    certificates: row.providers.certificates || [],
  }));
}

async function createBooking({ customerId, customerName, provider, service, address }) {
  const scheduledDate = new Date(Date.now() + 86400000);
  scheduledDate.setHours(10, 0, 0, 0);

  const { data, error } = await adminClient
    .from('bookings')
    .insert({
      service_id: service.id,
      customer_id: customerId,
      provider_id: provider.providerId,
      service_title: service.name,
      provider_name: provider.businessName,
      customer_name: customerName,
      scheduled_date: scheduledDate.toISOString(),
      status: 'pending',
      amount: provider.price,
      address,
    })
    .select('id, booking_code')
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* copy (no emojis)                                                    */
/* ------------------------------------------------------------------ */

const MSG = {
  welcome: 'Welcome to SevaLink.',
  askName: 'You are new here. Please send your full name.',
  askEmail: 'Thanks. Please send your email address.',
  invalidEmail: 'That does not look like a valid email. Please send a valid email address.',
  profileCreated: (name) => `Thanks ${name}, your account is set up.`,
  chooseCategory: 'Please choose a category.',
  noCategories: 'No categories are available right now. Please try again later.',
  chooseService: 'Please choose a service.',
  noServices: 'No services found in this category. Reply MENU to choose a different category.',
  chooseProvider: 'Please choose a provider.',
  noProviders: 'No providers are available for this service right now. Reply MENU to start over.',
  providerSummary: (p) =>
    `${p.businessName}\nRating: ${p.rating || 'Not rated yet'}\nExperience: ${p.experience || 'Not specified'}\nPrice: Rs. ${p.price}\n\nWhat would you like to do?`,
  providerDetails: (p) =>
    `${p.businessName}\n\nAbout: ${p.about || 'No description provided.'}\nExperience: ${p.experience || 'Not specified'}\nRating: ${p.rating || 'Not rated yet'}\nVerified: ${p.verified ? 'Yes' : 'No'}\nPrice: Rs. ${p.price}`,
  askAddress: 'Please send the address where the service is needed.',
  confirmBooking: (s) =>
    `Please confirm your booking.\n\nService: ${s.service}\nProvider: ${s.provider}\nPrice: Rs. ${s.price}\nAddress: ${s.address}`,
  bookingCreated: (code, s) =>
    `Booking confirmed.\n\nBooking code: ${code}\nService: ${s.service}\nProvider: ${s.provider}\nStatus: Pending confirmation from the provider.`,
  bookingFailed: 'Something went wrong while creating your booking. Please try again.',
  cancelled: 'Booking cancelled.',
  invalid: 'Sorry, I did not understand that. Please choose one of the options shown.',
  genericError: 'Something went wrong. Please try again in a moment.',
};

/* ------------------------------------------------------------------ */
/* interactive reply parsing                                           */
/* ------------------------------------------------------------------ */

function parseInbound(message) {
  if (message.type === 'text') {
    return { kind: 'text', text: (message.text?.body || '').trim() };
  }
  if (message.type === 'interactive') {
    const i = message.interactive;
    if (i.type === 'list_reply') return { kind: 'list_reply', id: i.list_reply.id, title: i.list_reply.title };
    if (i.type === 'button_reply') return { kind: 'button_reply', id: i.button_reply.id, title: i.button_reply.title };
  }
  return { kind: 'unknown' };
}

// Resolve a reply against a stored list of choices, accepting either the
// interactive id or a typed number ("2") matching the item's position.
function resolveChoice(inbound, choices) {
  if (inbound.kind === 'list_reply' || inbound.kind === 'button_reply') {
    return choices.find((c) => c.id === inbound.id) || null;
  }
  if (inbound.kind === 'text') {
    const n = Number(inbound.text.trim());
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1];
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GREETINGS = ['hi', 'hey', 'hello', 'start', 'menu'];

/* ------------------------------------------------------------------ */
/* the flow                                                             */
/* ------------------------------------------------------------------ */

async function handleMessage({ phone, waName, inbound }) {
  const session = getSession(phone);

  const isGreeting = inbound.kind === 'text' && GREETINGS.includes(inbound.text.toLowerCase());
  if (isGreeting) {
    session.step = 'init';
    session.draft = {};
    saveSession(phone, session);
  }

  // Entry point: resolve the profile, then branch to onboarding or categories.
  if (session.step === 'init') {
    await sendText(phone, MSG.welcome);

    let profile = session.profile;
    if (!profile) profile = await findProfileByPhone(phone);

    if (profile) {
      session.profile = profile;
      return showCategories(phone, session);
    }

    session.step = 'onboard_name';
    session.draft = { name: null, email: null };
    saveSession(phone, session);
    return sendText(phone, MSG.askName);
  }

  switch (session.step) {
    case 'onboard_name': {
      if (inbound.kind !== 'text' || inbound.text.length < 2) return sendText(phone, MSG.askName);
      session.draft.name = inbound.text;
      session.step = 'onboard_email';
      saveSession(phone, session);
      return sendText(phone, MSG.askEmail);
    }

    case 'onboard_email': {
      if (inbound.kind !== 'text' || !EMAIL_RE.test(inbound.text)) return sendText(phone, MSG.invalidEmail);
      session.draft.email = inbound.text;
      const profile = await createProfile({ phone, name: session.draft.name, email: session.draft.email });
      session.profile = profile;
      session.step = 'categories';
      session.draft = {};
      saveSession(phone, session);
      await sendText(phone, MSG.profileCreated(profile.full_name));
      return showCategories(phone, session);
    }

    case 'categories': {
      const choice = resolveChoice(inbound, session.draft.categories || []);
      if (!choice) return showCategories(phone, session, true);
      session.draft.category = choice;
      session.step = 'services';
      saveSession(phone, session);
      return showServices(phone, session);
    }

    case 'services': {
      const choice = resolveChoice(inbound, session.draft.services || []);
      if (!choice) return showServices(phone, session, true);
      session.draft.service = choice;
      session.step = 'providers';
      saveSession(phone, session);
      return showProviders(phone, session);
    }

    case 'providers': {
      const choice = resolveChoice(inbound, session.draft.providers || []);
      if (!choice) return showProviders(phone, session, true);
      session.draft.provider = choice;
      session.step = 'provider_action';
      saveSession(phone, session);
      return sendButtons(phone, MSG.providerSummary(choice), [
        { id: 'book_now', title: 'Book' },
        { id: 'view_details', title: 'View Details' },
      ]);
    }

    case 'provider_action': {
      const id = inbound.kind === 'button_reply' ? inbound.id : inbound.kind === 'text' ? inbound.text.toLowerCase() : '';
      if (id === 'view_details' || id === '2') {
        session.step = 'provider_details';
        saveSession(phone, session);
        return sendButtons(phone, MSG.providerDetails(session.draft.provider), [
          { id: 'book_now', title: 'Book' },
          { id: 'back_to_providers', title: 'Back' },
        ]);
      }
      if (id === 'book_now' || id === '1') {
        session.step = 'await_address';
        saveSession(phone, session);
        return sendText(phone, MSG.askAddress);
      }
      return sendButtons(phone, MSG.invalid, [
        { id: 'book_now', title: 'Book' },
        { id: 'view_details', title: 'View Details' },
      ]);
    }

    case 'provider_details': {
      const id = inbound.kind === 'button_reply' ? inbound.id : inbound.kind === 'text' ? inbound.text.toLowerCase() : '';
      if (id === 'book_now' || id === '1') {
        session.step = 'await_address';
        saveSession(phone, session);
        return sendText(phone, MSG.askAddress);
      }
      if (id === 'back_to_providers') {
        session.step = 'providers';
        saveSession(phone, session);
        return showProviders(phone, session);
      }
      return sendButtons(phone, MSG.invalid, [
        { id: 'book_now', title: 'Book' },
        { id: 'back_to_providers', title: 'Back' },
      ]);
    }

    case 'await_address': {
      if (inbound.kind !== 'text' || inbound.text.length < 5) return sendText(phone, MSG.askAddress);
      session.draft.address = inbound.text;
      session.step = 'confirm_booking';
      saveSession(phone, session);
      return sendButtons(
        phone,
        MSG.confirmBooking({
          service: session.draft.service.title,
          provider: session.draft.provider.businessName,
          price: session.draft.provider.price,
          address: session.draft.address,
        }),
        [
          { id: 'confirm_yes', title: 'Confirm' },
          { id: 'confirm_no', title: 'Cancel' },
        ]
      );
    }

    case 'confirm_booking': {
      const id = inbound.kind === 'button_reply' ? inbound.id : inbound.kind === 'text' ? inbound.text.toLowerCase() : '';
      if (id === 'confirm_no' || id === '2') {
        session.step = 'categories';
        session.draft = {};
        saveSession(phone, session);
        await sendText(phone, MSG.cancelled);
        return showCategories(phone, session);
      }
      if (id !== 'confirm_yes' && id !== '1') {
        return sendButtons(phone, MSG.invalid, [
          { id: 'confirm_yes', title: 'Confirm' },
          { id: 'confirm_no', title: 'Cancel' },
        ]);
      }

      try {
        const booking = await createBooking({
          customerId: session.profile.id,
          customerName: session.profile.full_name,
          provider: session.draft.provider,
          service: session.draft.service,
          address: session.draft.address,
        });
        await sendText(
          phone,
          MSG.bookingCreated(booking.booking_code, {
            service: session.draft.service.title,
            provider: session.draft.provider.businessName,
          })
        );
      } catch (err) {
        console.error('[createBooking]', err.message);
        await sendText(phone, MSG.bookingFailed);
      }

      session.step = 'categories';
      session.draft = {};
      saveSession(phone, session);
      return showCategories(phone, session);
    }

    default: {
      session.step = 'init';
      saveSession(phone, session);
      return sendText(phone, MSG.welcome);
    }
  }
}

async function showCategories(phone, session, wasInvalid) {
  const categories = await fetchCategories();
  if (categories.length === 0) return sendText(phone, MSG.noCategories);

  const items = categories.map((c) => ({ id: c.id, title: c.name, description: c.description || '' }));
  session.draft.categories = items;
  session.step = 'categories';
  saveSession(phone, session);

  const body = numberedBody(wasInvalid ? MSG.invalid + ' ' + MSG.chooseCategory : MSG.chooseCategory, items);
  return sendList(phone, body, 'Choose', items, 'Categories');
}

async function showServices(phone, session, wasInvalid) {
  const services = await fetchServices(session.draft.category.id);
  if (services.length === 0) return sendText(phone, MSG.noServices);

  const items = services.map((s) => ({ id: s.id, title: s.name, description: s.description || '' }));
  session.draft.services = items;
  session.step = 'services';
  saveSession(phone, session);

  const body = numberedBody(wasInvalid ? MSG.invalid + ' ' + MSG.chooseService : MSG.chooseService, items);
  return sendList(phone, body, 'Choose', items, 'Services');
}

async function showProviders(phone, session, wasInvalid) {
  const providers = await fetchProviders(session.draft.service.id);
  if (providers.length === 0) return sendText(phone, MSG.noProviders);

  const items = providers.map((p) => ({
    id: p.providerId,
    title: p.businessName,
    description: `Rating ${p.rating || 'NA'} - Rs. ${p.price}`,
    _full: p,
  }));
  session.draft.providers = items.map((i) => ({ ...i, ...i._full }));
  session.step = 'providers';
  saveSession(phone, session);

  const body = numberedBody(wasInvalid ? MSG.invalid + ' ' + MSG.chooseProvider : MSG.chooseProvider, items);
  return sendList(phone, body, 'Choose', items, 'Providers');
}

/* ------------------------------------------------------------------ */
/* webhook server                                                       */
/* ------------------------------------------------------------------ */

async function processInbound(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return;

  if (seenMessageIds.has(message.id)) {
    console.log('Duplicate webhook ignored:', message.id);
    return;
  }
  seenMessageIds.add(message.id);

  const contact = value?.contacts?.[0];
  const phone = message.from;
  const waName = contact?.profile?.name || 'Customer';
  const inbound = parseInbound(message);

  console.log(`\nInbound from ${waName} (${phone}):`, inbound);

  try {
    await handleMessage({ phone, waName, inbound });
  } catch (err) {
    console.error('Handler error:', err);
    await sendText(phone, MSG.genericError);
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET') {
    const mode = parsedUrl.searchParams.get('hub.mode');
    const token = parsedUrl.searchParams.get('hub.verify_token');
    const challenge = parsedUrl.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(challenge);
    }
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (req.method === 'POST') {
    let bodyText = '';
    req.on('data', (chunk) => (bodyText += chunk));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));

      let body;
      try {
        body = JSON.parse(bodyText || '{}');
      } catch (err) {
        console.error('Bad JSON payload:', err.message);
        return;
      }
      processInbound(body).catch((err) => console.error('processInbound:', err));
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`\nSevaLink WhatsApp server -> http://localhost:${PORT}`);
  console.log(`Verify token: ${VERIFY_TOKEN}`);
  console.log(
    WHATSAPP_ACCESS_TOKEN
      ? `Access token loaded (${WHATSAPP_ACCESS_TOKEN.length} chars)`
      : 'No WHATSAPP_ACCESS_TOKEN - replies will print to console only (mock mode)'
  );
  console.log('Press Ctrl+C to stop.\n');
});