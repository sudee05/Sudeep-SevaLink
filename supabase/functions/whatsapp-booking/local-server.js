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
const PROVIDER_WEBSITE = 'https://sudeep-seva-link.vercel.app/provider';

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
/* outbound: text / image / list / buttons                             */
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

/** Send provider image before detail text. imageUrl must be a public HTTPS URL. */
function sendImage(to, imageUrl, caption) {
  return callMeta({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: { link: imageUrl, caption: caption || '' },
  });
}

// items: [{ id, title, description }]  — max 10 rows, title max 24 chars, description max 72 chars
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

function numberedBody(bodyText, items) {
  const lines = items.map((item, i) => `${i + 1}. ${item.title}`);
  return `${bodyText}\n\n${lines.join('\n')}`;
}

/* ------------------------------------------------------------------ */
/* session store — 5-minute inactivity timeout                        */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 5 * 60 * 1000;
const sessions = new Map();
const seenMessageIds = new Set();

function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing && Date.now() - existing.updatedAt < SESSION_TTL_MS) return existing;
  const fresh = {
    step: 'init',
    profile: null,
    lang: existing?.lang || null, // preserve language choice across sessions
    draft: {},
    updatedAt: Date.now(),
    expired: !!existing,
  };
  sessions.set(phone, fresh);
  return fresh;
}

function saveSession(phone, session) {
  session.updatedAt = Date.now();
  session.expired = false;
  sessions.set(phone, session);
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, s] of sessions) if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(phone);
  if (seenMessageIds.size > 2000) seenMessageIds.clear();
}, 5 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* i18n — English + Kannada                                           */
/* ------------------------------------------------------------------ */

const MSG = {
  en: {
    chooseLang: 'Welcome to SevaLink!\n\nPlease choose your language.',
    welcome: 'Welcome to SevaLink.',
    sessionExpired: 'Your session timed out after 5 minutes of inactivity. Starting fresh.',
    askName: 'You are new here. Please send your full name.',
    askEmail: 'Thanks. Please send your email address.',
    invalidEmail: 'That does not look like a valid email. Please send a valid email address.',
    profileCreated: (name) => `Thanks ${name}, your account is set up.`,
    chooseCategory: 'Please choose a category.',
    noCategories: 'No categories are available right now. Please try again later.',
    chooseService: 'Please choose a service.',
    noServices: 'No services found in this category. Reply MENU to choose a different category.',
    chooseProvider: 'Please choose a provider.',
    noProviders: 'No approved providers are available for this service. Reply MENU to start over.',
    providerSummary: (p) =>
      `${p.businessName}\nRating: ${p.rating || 'Not rated yet'}\nExperience: ${p.experience || 'Not specified'}\nPrice: Rs. ${p.price}\n\nWhat would you like to do?`,
    providerDetails: (p) =>
      `${p.businessName}\n\nAbout: ${p.about || 'No description provided.'}\nExperience: ${p.experience || 'Not specified'}\nRating: ${p.rating || 'Not rated yet'}\nVerified: ${p.verified ? 'Yes' : 'No'}\nPrice: Rs. ${p.price}`,
    askAddress: 'Please send the address where the service is needed.',
    askDate: 'Please enter the preferred date.\nFormat: DD/MM/YYYY  e.g. 25/09/2026',
    invalidDate: 'That does not look like a valid date. Please use DD/MM/YYYY format, e.g. 25/09/2026',
    askTime: 'Please enter the preferred time.\nFormat: HH:MM AM/PM  e.g. 10:30 AM  or 24h e.g. 14:30',
    invalidTime: 'That does not look like a valid time. Please use HH:MM AM/PM or 24h format.',
    confirmBooking: (s) =>
      `Please confirm your booking.\n\nService: ${s.service}\nProvider: ${s.provider}\nDate: ${s.date}\nTime: ${s.time}\nPrice: Rs. ${s.price}\nAddress: ${s.address}`,
    bookingCreated: (code, s) =>
      `Booking confirmed.\n\nBooking code: ${code}\nService: ${s.service}\nProvider: ${s.provider}\nDate: ${s.date}\nTime: ${s.time}\nStatus: Pending confirmation from the provider.`,
    bookingFailed: 'Something went wrong while creating your booking. Please try again.',
    cancelled: 'Booking cancelled.',
    invalid: 'Sorry, I did not understand that. Please choose one of the options shown.',
    genericError: 'Something went wrong. Please try again in a moment.',
    // My Bookings
    noBookings: 'You have no recent bookings. Reply MENU to make a new booking.',
    chooseBooking: 'Here are your recent bookings. Select one to view details.',
    bookingDetail: (b) =>
      `Booking: ${b.booking_code}\nService: ${b.service_title}\nProvider: ${b.provider_name}\nDate: ${b.booking_date || 'Not set'}\nTime: ${b.booking_time || 'Not set'}\nStatus: ${b.status}\nAmount: Rs. ${b.amount}\nAddress: ${b.address}`,
    cannotCancel: (status) => `This booking cannot be cancelled because its status is "${status}". Only pending or accepted bookings can be cancelled.`,
    confirmCancel: 'Are you sure you want to cancel this booking?',
    cancelSuccess: (code) => `Booking ${code} has been cancelled successfully.`,
    cancelFailed: 'Could not cancel the booking. Please try again.',
    // Buttons / labels
    btnBook: 'Book',
    btnViewDetails: 'View Details',
    btnBack: 'Back',
    btnConfirm: 'Confirm',
    btnCancel: 'Cancel',
    btnYes: 'Yes, Cancel',
    btnNo: 'No, Keep It',
    btnOk: 'OK',
    lblCategories: 'Categories',
    lblServices: 'Services',
    lblProviders: 'Providers',
    lblBookings: 'My Bookings',
    // Main menu
    mainMenuBody: (name) => `Hello ${name}! How can we help you today?`,
    mainMenuBodyNew: 'Welcome! What would you like to do?',
    menuBookService: 'Book a Service',
    menuMyBookings: 'My Bookings',
    menuHelp: 'Help',
  },

  kn: {
    chooseLang: 'ಸೇವಾಲಿಂಕ್‌ಗೆ ಸ್ವಾಗತ!\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ.',
    welcome: 'ಸೇವಾಲಿಂಕ್‌ಗೆ ಸ್ವಾಗತ.',
    sessionExpired: '5 ನಿಮಿಷ ಪ್ರತಿಕ್ರಿಯೆ ಇಲ್ಲದ ಕಾರಣ ಸೆಶನ್ ಮುಗಿದಿದೆ. ಹೊಸದಾಗಿ ಆರಂಭಿಸೋಣ.',
    askName: 'ನೀವು ಹೊಸಬರು. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ಕಳುಹಿಸಿ.',
    askEmail: 'ಧನ್ಯವಾದ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ಕಳುಹಿಸಿ.',
    invalidEmail: 'ಅದು ಸರಿಯಾದ ಇಮೇಲ್ ಅಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಕಳುಹಿಸಿ.',
    profileCreated: (name) => `ಧನ್ಯವಾದ ${name}, ನಿಮ್ಮ ಖಾತೆ ಸಿದ್ಧವಾಗಿದೆ.`,
    chooseCategory: 'ದಯವಿಟ್ಟು ವರ್ಗವನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    noCategories: 'ಈಗ ಯಾವುದೇ ವರ್ಗಗಳು ಲಭ್ಯವಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    chooseService: 'ದಯವಿಟ್ಟು ಸೇವೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    noServices: 'ಈ ವರ್ಗದಲ್ಲಿ ಯಾವುದೇ ಸೇವೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. MENU ಎಂದು ಉತ್ತರಿಸಿ.',
    chooseProvider: 'ದಯವಿಟ್ಟು ಸೇವಾ ಪೂರೈಕೆದಾರರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    noProviders: 'ಈ ಸೇವೆಗೆ ಈಗ ಯಾವುದೇ ಅನುಮೋದಿತ ಪೂರೈಕೆದಾರರಿಲ್ಲ. MENU ಎಂದು ಉತ್ತರಿಸಿ.',
    providerSummary: (p) =>
      `${p.businessName}\nರೇಟಿಂಗ್: ${p.rating || 'ರೇಟ್ ಆಗಿಲ್ಲ'}\nಅನುಭವ: ${p.experience || 'ನಮೂದಿಸಲಾಗಿಲ್ಲ'}\nಬೆಲೆ: ರೂ. ${p.price}\n\nನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`,
    providerDetails: (p) =>
      `${p.businessName}\n\nಪರಿಚಯ: ${p.about || 'ವಿವರಣೆ ಇಲ್ಲ.'}\nಅನುಭವ: ${p.experience || 'ನಮೂದಿಸಲಾಗಿಲ್ಲ'}\nರೇಟಿಂಗ್: ${p.rating || 'ರೇಟ್ ಆಗಿಲ್ಲ'}\nಪರಿಶೀಲಿಸಲಾಗಿದೆ: ${p.verified ? 'ಹೌದು' : 'ಇಲ್ಲ'}\nಬೆಲೆ: ರೂ. ${p.price}`,
    askAddress: 'ಸೇವೆ ಬೇಕಾಗಿರುವ ವಿಳಾಸ ಕಳುಹಿಸಿ.',
    askDate: 'ಆದ್ಯತೆಯ ದಿನಾಂಕ ನಮೂದಿಸಿ.\nಮಾದರಿ: DD/MM/YYYY  ಉದಾ: 25/09/2026',
    invalidDate: 'ಅದು ಸರಿಯಾದ ದಿನಾಂಕ ಅಲ್ಲ. DD/MM/YYYY ಮಾದರಿ ಬಳಸಿ.',
    askTime: 'ಆದ್ಯತೆಯ ಸಮಯ ನಮೂದಿಸಿ.\nಮಾದರಿ: HH:MM AM/PM  ಉದಾ: 10:30 AM',
    invalidTime: 'ಅದು ಸರಿಯಾದ ಸಮಯ ಅಲ್ಲ. HH:MM AM/PM ಮಾದರಿ ಬಳಸಿ.',
    confirmBooking: (s) =>
      `ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬುಕಿಂಗ್ ದೃಢೀಕರಿಸಿ.\n\nಸೇವೆ: ${s.service}\nಪೂರೈಕೆದಾರ: ${s.provider}\nದಿನಾಂಕ: ${s.date}\nಸಮಯ: ${s.time}\nಬೆಲೆ: ರೂ. ${s.price}\nವಿಳಾಸ: ${s.address}`,
    bookingCreated: (code, s) =>
      `ಬುಕಿಂಗ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ.\n\nಬುಕಿಂಗ್ ಕೋಡ್: ${code}\nಸೇವೆ: ${s.service}\nಪೂರೈಕೆದಾರ: ${s.provider}\nದಿನಾಂಕ: ${s.date}\nಸಮಯ: ${s.time}\nಸ್ಥಿತಿ: ಪೂರೈಕೆದಾರರ ದೃಢೀಕರಣಕ್ಕಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ.',
    bookingFailed: 'ಬುಕಿಂಗ್ ಮಾಡುವಾಗ ತೊಂದರೆಯಾಯಿತು. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    cancelled: 'ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.',
    invalid: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ತೋರಿಸಿದ ಆಯ್ಕೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ.',
    genericError: 'ತೊಂದರೆಯಾಯಿತು. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    // My Bookings
    noBookings: 'ನಿಮ್ಮ ಯಾವುದೇ ಇತ್ತೀಚಿನ ಬುಕಿಂಗ್‌ಗಳಿಲ್ಲ. ಹೊಸ ಬುಕಿಂಗ್ ಮಾಡಲು MENU ಎಂದು ಉತ್ತರಿಸಿ.',
    chooseBooking: 'ನಿಮ್ಮ ಇತ್ತೀಚಿನ ಬುಕಿಂಗ್‌ಗಳು ಇಲ್ಲಿವೆ. ವಿವರಗಳಿಗಾಗಿ ಒಂದನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    bookingDetail: (b) =>
      `ಬುಕಿಂಗ್: ${b.booking_code}\nಸೇವೆ: ${b.service_title}\nಪೂರೈಕೆದಾರ: ${b.provider_name}\nದಿನಾಂಕ: ${b.booking_date || 'ನಮೂದಿಸಲಾಗಿಲ್ಲ'}\nಸಮಯ: ${b.booking_time || 'ನಮೂದಿಸಲಾಗಿಲ್ಲ'}\nಸ್ಥಿತಿ: ${b.status}\nಮೊತ್ತ: ರೂ. ${b.amount}\nವಿಳಾಸ: ${b.address}`,
    cannotCancel: (status) => `ಈ ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ ಏಕೆಂದರೆ ಅದರ ಸ್ಥಿತಿ "${status}" ಆಗಿದೆ. ಕೇವಲ ಬಾಕಿ ಅಥವಾ ಸ್ವೀಕರಿಸಲಾದ ಬುಕಿಂಗ್‌ಗಳನ್ನು ರದ್ದುಗೊಳಿಸಬಹುದು.`,
    confirmCancel: 'ನೀವು ಖಂಡಿತವಾಗಿ ಈ ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲು ಬಯಸುತ್ತೀರಾ?',
    cancelSuccess: (code) => `ಬುಕಿಂಗ್ ${code} ಯಶಸ್ವಿಯಾಗಿ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.`,
    cancelFailed: 'ಬುಕಿಂಗ್ ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    // Buttons / labels
    btnBook: 'ಬುಕ್ ಮಾಡಿ',
    btnViewDetails: 'ವಿವರ ನೋಡಿ',
    btnBack: 'ಹಿಂದೆ',
    btnConfirm: 'ದೃಢೀಕರಿಸಿ',
    btnCancel: 'ರದ್ದುಮಾಡಿ',
    btnYes: 'ಹೌದು, ರದ್ದುಮಾಡಿ',
    btnNo: 'ಇಲ್ಲ, ಇರಲಿ',
    btnOk: 'ಸರಿ',
    lblCategories: 'ವರ್ಗಗಳು',
    lblServices: 'ಸೇವೆಗಳು',
    lblProviders: 'ಪೂರೈಕೆದಾರರು',
    lblBookings: 'ನನ್ನ ಬುಕಿಂಗ್',
    // Main menu
    mainMenuBody: (name) => `ನಮಸ್ಕಾರ ${name}! ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು?`,
    mainMenuBodyNew: 'ಸ್ವಾಗತ! ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?',
    menuBookService: 'ಸೇವೆ ಬುಕ್ ಮಾಡಿ',
    menuMyBookings: 'ನನ್ನ ಬುಕಿಂಗ್',
    menuHelp: 'ಸಹಾಯ',
  },
};

/** Translate a message key for the user's chosen language. */
function t(session, key, ...args) {
  const lang = session.lang || 'en';
  const strings = MSG[lang] || MSG.en;
  const val = strings[key] ?? MSG.en[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

/* ------------------------------------------------------------------ */
/* data access                                                         */
/* ------------------------------------------------------------------ */

async function findProfileByPhone(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, '');
  const formatted = `+${digits}`;
  // Provider approval is checked via providers.status, not profiles.approval_status.
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role')
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
    .select('id, full_name, phone, role')
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

// Approval checked via providers.status = 'approved' (not profiles.approval_status).
async function fetchProviders(serviceId) {
  const { data, error } = await adminClient
    .from('provider_services')
    .select(
      'price, provider_id, providers!inner(id, business_name, rating, experience, about, verified, status, certificates, image_url)'
    )
    .eq('service_id', serviceId)
    .eq('providers.status', 'approved')
    .limit(9);

  if (error) {
    console.warn('[fetchProviders] query error:', error.message);
    return [];
  }

  if (data.length === 0) {
    const { data: unfiltered, error: rawError } = await adminClient
      .from('provider_services')
      .select('provider_id, providers(business_name, status)')
      .eq('service_id', serviceId);
    if (rawError) {
      console.warn('[fetchProviders] diagnostic query error:', rawError.message);
    } else if (!unfiltered || unfiltered.length === 0) {
      console.warn(`[fetchProviders] No rows in provider_services for service_id=${serviceId}.`);
    } else {
      const statuses = unfiltered.map(
        (r) => `${r.providers?.business_name || r.provider_id}: ${r.providers?.status}`
      );
      console.warn(`[fetchProviders] ${unfiltered.length} provider(s) linked but none approved. Statuses: ${statuses.join(', ')}`);
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
    imageUrl: row.providers.image_url || '',
  }));
}

/** Fetch last 5 bookings for a customer (any active/closed status). */
async function fetchCustomerBookings(customerId) {
  const { data, error } = await adminClient
    .from('bookings')
    .select('id, booking_code, service_title, provider_name, status, booking_date, booking_time, amount, address')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) {
    console.warn('[fetchCustomerBookings]', error.message);
    return [];
  }
  return data || [];
}

/**
 * Cancel a booking — only allowed if status is 'pending' or 'accepted'
 * and the booking belongs to this customer.
 * Returns { success, status } where status is the current status if blocked.
 */
async function cancelBooking(bookingId, customerId) {
  // First fetch the booking to check ownership + status.
  const { data: existing, error: fetchErr } = await adminClient
    .from('bookings')
    .select('id, status, booking_code, customer_id')
    .eq('id', bookingId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.warn('[cancelBooking] fetch error or not found:', fetchErr?.message);
    return { success: false, status: null };
  }

  const cancellable = ['pending', 'accepted'];
  if (!cancellable.includes(existing.status)) {
    return { success: false, status: existing.status };
  }

  const { error: updateErr } = await adminClient
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('customer_id', customerId);

  if (updateErr) {
    console.warn('[cancelBooking] update error:', updateErr.message);
    return { success: false, status: existing.status };
  }

  return { success: true, bookingCode: existing.booking_code };
}

/** Notify provider via WhatsApp after a booking is created. */
async function getProviderPhone(providerId) {
  const { data, error } = await adminClient
    .from('providers')
    .select('user_id, profiles!inner(phone)')
    .eq('id', providerId)
    .maybeSingle();
  if (error) { console.warn('[getProviderPhone]', error.message); return null; }
  return data?.profiles?.phone || null;
}

async function notifyProvider(providerId, bookingCode) {
  try {
    const providerPhone = await getProviderPhone(providerId);
    if (!providerPhone) { console.warn(`[notifyProvider] No phone for provider ${providerId}`); return; }
    const digits = String(providerPhone).replace(/\D/g, '');
    const to = digits.startsWith('0') ? `91${digits.slice(1)}` : digits;
    await sendText(to, `You have a new booking! (Code: ${bookingCode})\n\nVisit your dashboard:\n${PROVIDER_WEBSITE}`);
    console.log(`[notifyProvider] Alert sent to ${to}`);
  } catch (err) {
    console.error('[notifyProvider]', err.message);
  }
}

/** Store booking with user-provided date and time. */
async function createBooking({ customerId, customerName, provider, service, address, bookingDate, bookingTime }) {
  let scheduledDate;
  try {
    scheduledDate = new Date(`${bookingDate}T${bookingTime}:00`);
    if (isNaN(scheduledDate.getTime())) throw new Error('Invalid');
  } catch {
    scheduledDate = new Date(Date.now() + 86400000);
    scheduledDate.setHours(10, 0, 0, 0);
  }

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
      booking_date: bookingDate,
      booking_time: bookingTime,
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
/* date / time helpers                                                 */
/* ------------------------------------------------------------------ */

function parseDate(text) {
  let match;
  match = text.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (match) {
    const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  match = text.trim().match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (match) {
    const iso = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  return null;
}

function parseTime(text) {
  let match;
  match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    if (match[3].toLowerCase() === 'pm' && h !== 12) h += 12;
    if (match[3].toLowerCase() === 'am' && h === 12) h = 0;
    if (h >= 0 && h < 24 && parseInt(m) < 60) return `${String(h).padStart(2, '0')}:${m}`;
  }
  match = text.trim().match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

function prettyDate(iso) {
  if (!iso) return 'Not set';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function prettyTime(time24) {
  if (!time24) return 'Not set';
  const [hh, mm] = time24.split(':');
  const h = parseInt(hh, 10);
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/* ------------------------------------------------------------------ */
/* keyword detection                                                   */
/* ------------------------------------------------------------------ */

const GREETINGS_EN = ['hi', 'hey', 'hello', 'start', 'menu'];
const GREETINGS_KN = ['ನಮಸ್ಕಾರ', 'ಹೇ', 'ಹೇಯ್', 'ಶುರು', 'ಮೆನು'];

const MYBOOKINGS_EN = ['my bookings', 'bookings', 'my booking', 'view bookings', 'view booking'];
const MYBOOKINGS_KN = ['ನನ್ನ ಬುಕಿಂಗ್', 'ಬುಕಿಂಗ್‌ಗಳು', 'ಬುಕಿಂಗ್'];

function isGreeting(inbound) {
  if (inbound.kind !== 'text') return false;
  const lower = inbound.text.toLowerCase().trim();
  return GREETINGS_EN.includes(lower) || GREETINGS_KN.includes(inbound.text.trim());
}

function isMyBookings(inbound) {
  if (inbound.kind !== 'text') return false;
  const lower = inbound.text.toLowerCase().trim();
  return MYBOOKINGS_EN.includes(lower) || MYBOOKINGS_KN.includes(inbound.text.trim());
}

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

/* ------------------------------------------------------------------ */
/* the flow                                                             */
/* ------------------------------------------------------------------ */

async function handleMessage({ phone, waName, inbound }) {
  const session = getSession(phone);
  const wasExpired = session.expired;

  // ── Global: MENU / greeting ──────────────────────────────────────
  if (isGreeting(inbound)) {
    session.step = 'init';
    session.draft = {};
    saveSession(phone, session);
  }

  // ── Global: MY BOOKINGS (from any step except booking-sub-steps) ─
  const bookingSubSteps = ['view_bookings', 'booking_selected', 'cancel_confirm'];
  if (
    isMyBookings(inbound) &&
    !bookingSubSteps.includes(session.step) &&
    session.profile
  ) {
    session.step = 'view_bookings';
    session.draft.bookingList = null;
    saveSession(phone, session);
    return showMyBookings(phone, session);
  }

  // ── Entry point ──────────────────────────────────────────────────
  if (session.step === 'init') {
    if (wasExpired && !isGreeting(inbound)) {
      await sendText(phone, t(session, 'sessionExpired'));
    }

    // Language choice: ask once if not set yet.
    if (!session.lang) {
      session.step = 'choose_lang';
      saveSession(phone, session);
      return sendButtons(phone, MSG.en.chooseLang, [
        { id: 'lang_en', title: 'English' },
        { id: 'lang_kn', title: 'ಕನ್ನಡ' },
      ]);
    }

    await sendText(phone, t(session, 'welcome'));

    let profile = session.profile;
    if (!profile) profile = await findProfileByPhone(phone);

    if (profile) {
      session.profile = profile;
      return showMainMenu(phone, session);
    }

    session.step = 'onboard_name';
    session.draft = { name: null, email: null };
    saveSession(phone, session);
    return sendText(phone, t(session, 'askName'));
  }

  switch (session.step) {

    // ── Language selection ─────────────────────────────────────────
    case 'choose_lang': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase().trim()
               : '';
      if (id === 'lang_kn' || id === 'kn' || id === 'kannada' || id === 'ಕನ್ನಡ') {
        session.lang = 'kn';
      } else {
        session.lang = 'en'; // default to English for anything else
      }
      session.step = 'init';
      saveSession(phone, session);

      await sendText(phone, t(session, 'welcome'));

      let profile = session.profile;
      if (!profile) profile = await findProfileByPhone(phone);

      if (profile) {
        session.profile = profile;
        return showMainMenu(phone, session);
      }

      session.step = 'onboard_name';
      session.draft = { name: null, email: null };
      saveSession(phone, session);
      return sendText(phone, t(session, 'askName'));
    }

    // ── Onboarding ─────────────────────────────────────────────────
    case 'onboard_name': {
      if (inbound.kind !== 'text' || inbound.text.length < 2) return sendText(phone, t(session, 'askName'));
      session.draft.name = inbound.text;
      session.step = 'onboard_email';
      saveSession(phone, session);
      return sendText(phone, t(session, 'askEmail'));
    }

    case 'onboard_email': {
      if (inbound.kind !== 'text' || !EMAIL_RE.test(inbound.text)) return sendText(phone, t(session, 'invalidEmail'));
      session.draft.email = inbound.text;
      const profile = await createProfile({ phone, name: session.draft.name, email: session.draft.email });
      session.profile = profile;
      session.step = 'main_menu';
      session.draft = {};
      saveSession(phone, session);
      await sendText(phone, t(session, 'profileCreated', profile.full_name));
      return showMainMenu(phone, session);
    }

    // ── Main menu ──────────────────────────────────────────────────
    case 'main_menu': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'list_reply'   ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase().trim()
               : '';
      if (id === 'menu_book' || id === '1') {
        session.step = 'categories';
        saveSession(phone, session);
        return showCategories(phone, session);
      }
      if (id === 'menu_bookings' || id === '2') {
        if (!session.profile) return showMainMenu(phone, session, true);
        session.step = 'view_bookings';
        session.draft.bookingList = null;
        saveSession(phone, session);
        return showMyBookings(phone, session);
      }
      if (id === 'menu_help' || id === '3') {
        const helpText = session.lang === 'kn'
          ? `ಸಹಾಯ:
- ಸೇವೆ ಬುಕ್ ಮಾಡಲು "1" ಅಥವಾ "ಸೇವೆ ಬುಕ್ ಮಾಡಿ" ಎಂದು ಕಳುಹಿಸಿ.
- ನಿಮ್ಮ ಬುಕಿಂಗ್ ನೋಡಲು "2" ಅಥವಾ "ನನ್ನ ಬುಕಿಂಗ್" ಎಂದು ಕಳುಹಿಸಿ.
- ಮೆನು ಮರಳಿ ತೆರೆಯಲು MENU ಎಂದು ಕಳುಹಿಸಿ.`
          : `Help:
- Send "1" or "Book a Service" to find and book a provider.
- Send "2" or "My Bookings" to view or cancel your bookings.
- Send MENU at any time to return to this menu.`;
        await sendText(phone, helpText);
        return showMainMenu(phone, session);
      }
      return showMainMenu(phone, session, true);
    }

    // ── Service discovery ──────────────────────────────────────────
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
      return sendButtons(phone, t(session, 'providerSummary', choice), [
        { id: 'book_now', title: t(session, 'btnBook') },
        { id: 'view_details', title: t(session, 'btnViewDetails') },
      ]);
    }

    case 'provider_action': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase()
               : '';
      if (id === 'view_details' || id === '2') {
        session.step = 'provider_details';
        saveSession(phone, session);
        const provider = session.draft.provider;
        if (provider.imageUrl) await sendImage(phone, provider.imageUrl, provider.businessName);
        return sendButtons(phone, t(session, 'providerDetails', provider), [
          { id: 'book_now', title: t(session, 'btnBook') },
          { id: 'back_to_providers', title: t(session, 'btnBack') },
        ]);
      }
      if (id === 'book_now' || id === '1') {
        session.step = 'await_address';
        saveSession(phone, session);
        return sendText(phone, t(session, 'askAddress'));
      }
      return sendButtons(phone, t(session, 'invalid'), [
        { id: 'book_now', title: t(session, 'btnBook') },
        { id: 'view_details', title: t(session, 'btnViewDetails') },
      ]);
    }

    case 'provider_details': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase()
               : '';
      if (id === 'book_now' || id === '1') {
        session.step = 'await_address';
        saveSession(phone, session);
        return sendText(phone, t(session, 'askAddress'));
      }
      if (id === 'back_to_providers') {
        session.step = 'providers';
        saveSession(phone, session);
        return showProviders(phone, session);
      }
      return sendButtons(phone, t(session, 'invalid'), [
        { id: 'book_now', title: t(session, 'btnBook') },
        { id: 'back_to_providers', title: t(session, 'btnBack') },
      ]);
    }

    // ── Booking steps ──────────────────────────────────────────────
    case 'await_address': {
      if (inbound.kind !== 'text' || inbound.text.length < 5) return sendText(phone, t(session, 'askAddress'));
      session.draft.address = inbound.text;
      session.step = 'await_date';
      saveSession(phone, session);
      return sendText(phone, t(session, 'askDate'));
    }

    case 'await_date': {
      if (inbound.kind !== 'text') return sendText(phone, t(session, 'invalidDate'));
      const dateIso = parseDate(inbound.text);
      if (!dateIso) return sendText(phone, t(session, 'invalidDate'));
      session.draft.bookingDate = dateIso;
      session.step = 'await_time';
      saveSession(phone, session);
      return sendText(phone, t(session, 'askTime'));
    }

    case 'await_time': {
      if (inbound.kind !== 'text') return sendText(phone, t(session, 'invalidTime'));
      const time24 = parseTime(inbound.text);
      if (!time24) return sendText(phone, t(session, 'invalidTime'));
      session.draft.bookingTime = time24;
      session.step = 'confirm_booking';
      saveSession(phone, session);
      return sendButtons(
        phone,
        t(session, 'confirmBooking', {
          service: session.draft.service.title,
          provider: session.draft.provider.businessName,
          date: prettyDate(session.draft.bookingDate),
          time: prettyTime(session.draft.bookingTime),
          price: session.draft.provider.price,
          address: session.draft.address,
        }),
        [
          { id: 'confirm_yes', title: t(session, 'btnConfirm') },
          { id: 'confirm_no', title: t(session, 'btnCancel') },
        ]
      );
    }

    case 'confirm_booking': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase()
               : '';
      if (id === 'confirm_no' || id === '2') {
        session.step = 'categories';
        session.draft = {};
        saveSession(phone, session);
        await sendText(phone, t(session, 'cancelled'));
        return showCategories(phone, session);
      }
      if (id !== 'confirm_yes' && id !== '1') {
        return sendButtons(phone, t(session, 'invalid'), [
          { id: 'confirm_yes', title: t(session, 'btnConfirm') },
          { id: 'confirm_no', title: t(session, 'btnCancel') },
        ]);
      }

      try {
        const booking = await createBooking({
          customerId: session.profile.id,
          customerName: session.profile.full_name,
          provider: session.draft.provider,
          service: session.draft.service,
          address: session.draft.address,
          bookingDate: session.draft.bookingDate,
          bookingTime: session.draft.bookingTime,
        });
        await sendText(
          phone,
          t(session, 'bookingCreated', booking.booking_code, {
            service: session.draft.service.title,
            provider: session.draft.provider.businessName,
            date: prettyDate(session.draft.bookingDate),
            time: prettyTime(session.draft.bookingTime),
          })
        );
        await notifyProvider(session.draft.provider.providerId, booking.booking_code);
      } catch (err) {
        console.error('[createBooking]', err.message);
        await sendText(phone, t(session, 'bookingFailed'));
      }

      session.step = 'categories';
      session.draft = {};
      saveSession(phone, session);
      return showCategories(phone, session);
    }

    // ── My Bookings ────────────────────────────────────────────────
    case 'view_bookings': {
      const choice = resolveChoice(inbound, session.draft.bookingList || []);
      if (!choice) return showMyBookings(phone, session, true);
      session.draft.selectedBooking = choice;
      session.step = 'booking_selected';
      saveSession(phone, session);
      return showBookingDetail(phone, session);
    }

    case 'booking_selected': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase()
               : '';
      if (id === 'cancel_booking') {
        const bk = session.draft.selectedBooking;
        const cancellable = ['pending', 'accepted'];
        if (!cancellable.includes(bk.status)) {
          await sendText(phone, t(session, 'cannotCancel', bk.status));
          session.step = 'view_bookings';
          saveSession(phone, session);
          return showMyBookings(phone, session);
        }
        session.step = 'cancel_confirm';
        saveSession(phone, session);
        return sendButtons(phone, t(session, 'confirmCancel'), [
          { id: 'yes_cancel', title: t(session, 'btnYes') },
          { id: 'no_keep', title: t(session, 'btnNo') },
        ]);
      }
      if (id === 'back_to_bookings') {
        session.step = 'view_bookings';
        saveSession(phone, session);
        return showMyBookings(phone, session);
      }
      // OK button — go back to main menu
      if (id === 'ok_done') {
        session.step = 'main_menu';
        session.draft = {};
        saveSession(phone, session);
        return showMainMenu(phone, session);
      }
      return showBookingDetail(phone, session);
    }

    case 'cancel_confirm': {
      const id = inbound.kind === 'button_reply' ? inbound.id
               : inbound.kind === 'text'         ? inbound.text.toLowerCase()
               : '';
      if (id === 'yes_cancel' || id === '1') {
        const bk = session.draft.selectedBooking;
        const result = await cancelBooking(bk.id, session.profile.id);
        if (result.success) {
          await sendText(phone, t(session, 'cancelSuccess', result.bookingCode));
        } else {
          await sendText(phone, result.status
            ? t(session, 'cannotCancel', result.status)
            : t(session, 'cancelFailed'));
        }
        session.step = 'main_menu';
        session.draft = {};
        saveSession(phone, session);
        return showMainMenu(phone, session);
      }
      if (id === 'no_keep' || id === '2') {
        session.step = 'booking_selected';
        saveSession(phone, session);
        return showBookingDetail(phone, session);
      }
      return sendButtons(phone, t(session, 'confirmCancel'), [
        { id: 'yes_cancel', title: t(session, 'btnYes') },
        { id: 'no_keep', title: t(session, 'btnNo') },
      ]);
    }

    default: {
      session.step = 'init';
      saveSession(phone, session);
      if (session.profile && session.lang) return showMainMenu(phone, session);
      return sendText(phone, t(session, 'welcome'));
    }
  }
}

/* ------------------------------------------------------------------ */
/* show helpers                                                        */
/* ------------------------------------------------------------------ */

/** Main menu — shown after language selection, greeting, and post-booking. */
async function showMainMenu(phone, session, wasInvalid) {
  const name = session.profile?.full_name;
  const bodyText = wasInvalid
    ? t(session, 'invalid')
    : name
      ? t(session, 'mainMenuBody', name)
      : t(session, 'mainMenuBodyNew');

  session.step = 'main_menu';
  saveSession(phone, session);

  // Use a WhatsApp list so all 3 options are visible and numbered.
  const items = [
    { id: 'menu_book',     title: t(session, 'menuBookService'), description: session.lang === 'kn' ? 'ಸೇವಾ ಪೂರೈಕೆದಾರರನ್ನು ಹುಡುಕಿ ಬುಕ್ ಮಾಡಿ' : 'Find and book a service provider' },
    { id: 'menu_bookings', title: t(session, 'menuMyBookings'),  description: session.lang === 'kn' ? 'ನಿಮ್ಮ ಬುಕಿಂಗ್‌ಗಳನ್ನು ನೋಡಿ ಅಥವಾ ರದ್ದುಗೊಳಿಸಿ' : 'View or cancel your bookings' },
    { id: 'menu_help',    title: t(session, 'menuHelp'),         description: session.lang === 'kn' ? 'ಬಳಸುವ ವಿಧಾನ ತಿಳಿಯಿರಿ' : 'Learn how to use SevaLink' },
  ];

  const numbered = numberedBody(bodyText, items);
  return sendList(
    phone,
    numbered,
    session.lang === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose',
    items,
    session.lang === 'kn' ? 'ಮೆನು' : 'Main Menu'
  );
}

async function showCategories(phone, session, wasInvalid) {
  const categories = await fetchCategories();
  if (categories.length === 0) return sendText(phone, t(session, 'noCategories'));
  const items = categories.map((c) => ({ id: c.id, title: c.name, description: c.description || '' }));
  session.draft.categories = items;
  session.step = 'categories';
  saveSession(phone, session);
  const body = numberedBody(wasInvalid ? `${t(session, 'invalid')} ${t(session, 'chooseCategory')}` : t(session, 'chooseCategory'), items);
  return sendList(phone, body, session.lang === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose', items, t(session, 'lblCategories'));
}

async function showServices(phone, session, wasInvalid) {
  const services = await fetchServices(session.draft.category.id);
  if (services.length === 0) return sendText(phone, t(session, 'noServices'));
  const items = services.map((s) => ({ id: s.id, title: s.name, description: s.description || '' }));
  session.draft.services = items;
  session.step = 'services';
  saveSession(phone, session);
  const body = numberedBody(wasInvalid ? `${t(session, 'invalid')} ${t(session, 'chooseService')}` : t(session, 'chooseService'), items);
  return sendList(phone, body, session.lang === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose', items, t(session, 'lblServices'));
}

async function showProviders(phone, session, wasInvalid) {
  const providers = await fetchProviders(session.draft.service.id);
  if (providers.length === 0) return sendText(phone, t(session, 'noProviders'));
  const items = providers.map((p) => ({
    id: p.providerId,
    title: p.businessName,
    description: `Rating ${p.rating || 'NA'} - Rs. ${p.price}`,
    _full: p,
  }));
  session.draft.providers = items.map((i) => ({ ...i, ...i._full }));
  session.step = 'providers';
  saveSession(phone, session);
  const body = numberedBody(wasInvalid ? `${t(session, 'invalid')} ${t(session, 'chooseProvider')}` : t(session, 'chooseProvider'), items);
  return sendList(phone, body, session.lang === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose', items, t(session, 'lblProviders'));
}

async function showMyBookings(phone, session, wasInvalid) {
  const bookings = await fetchCustomerBookings(session.profile.id);
  if (bookings.length === 0) return sendText(phone, t(session, 'noBookings'));

  const items = bookings.map((b) => ({
    id: b.id,
    title: b.booking_code,
    description: `${b.service_title} · ${b.status}`.slice(0, 72),
    // store full booking object for later use
    ...b,
  }));

  session.draft.bookingList = items;
  session.step = 'view_bookings';
  saveSession(phone, session);

  const body = numberedBody(
    wasInvalid ? `${t(session, 'invalid')} ${t(session, 'chooseBooking')}` : t(session, 'chooseBooking'),
    items
  );
  return sendList(phone, body, session.lang === 'kn' ? 'ಆಯ್ಕೆ ಮಾಡಿ' : 'Choose', items, t(session, 'lblBookings'));
}

async function showBookingDetail(phone, session) {
  const bk = session.draft.selectedBooking;
  const detailText = t(session, 'bookingDetail', bk);
  const cancellable = ['pending', 'accepted'];

  if (cancellable.includes(bk.status)) {
    return sendButtons(phone, detailText, [
      { id: 'cancel_booking', title: t(session, 'btnCancel') },
      { id: 'back_to_bookings', title: t(session, 'btnBack') },
    ]);
  }

  // Non-cancellable booking — show detail with OK / Back only
  return sendButtons(phone, detailText, [
    { id: 'ok_done', title: t(session, 'btnOk') },
    { id: 'back_to_bookings', title: t(session, 'btnBack') },
  ]);
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
    await sendText(phone, 'Something went wrong. Please try again in a moment.');
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
      : 'No WHATSAPP_ACCESS_TOKEN - mock mode (replies printed to console)'
  );
  console.log('Languages: English + Kannada');
  console.log('Session timeout: 5 minutes');
  console.log('Press Ctrl+C to stop.\n');
});