// SevaLink WhatsApp Booking Bot — local server
// Kannada strings are stored as Romanized transliteration to avoid
// Node.js v24 Windows Unicode-in-template-literal parsing issues.
'use strict';
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
      const value = line.slice(eq + 1).trim().replace(/\r$/, '').replace(/^["'](.*)["']$/, '$1');
      if (key) process.env[key] = value;
    });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://giygtxqatkrgjeuojgma.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const WHATSAPP_ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sevalink_whatsapp_secret_sudeep';
const PORT = Number(process.env.PORT || 3001);
const PROVIDER_WEBSITE = 'https://sudeep-seva-link.vercel.app/provider';

if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase key. Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to supabase/functions/.env.');
}
if (!WHATSAPP_PHONE_ID) {
  console.warn('WARNING: WHATSAPP_PHONE_NUMBER_ID is not set — outbound sends will fail.');
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const cryptoLib = require('crypto');

/* ------------------------------------------------------------------ */
/* outbound helpers                                                    */
/* ------------------------------------------------------------------ */

async function callMeta(payload) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log('\n[MOCK OUTBOUND]', JSON.stringify(payload, null, 2), '\n');
    return { mock: true };
  }
  const url = 'https://graph.facebook.com/v25.0/' + WHATSAPP_PHONE_ID + '/messages';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + WHATSAPP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { console.error('[Meta send FAILED ' + res.status + ']', JSON.stringify(data)); return { error: data && data.error }; }
    console.log('[Meta send ok]', (data.messages && data.messages[0] && data.messages[0].id) || '');
    return data;
  } catch (err) {
    console.error('[Meta fetch error]', err.message);
    return { error: err.message };
  }
}

function sendText(to, body) {
  return callMeta({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } });
}

function sendImage(to, imageUrl, caption) {
  return callMeta({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'image', image: { link: imageUrl, caption: caption || '' } });
}

function sendList(to, bodyText, buttonLabel, items, sectionTitle) {
  const rows = items.slice(0, 10).map(function(item) {
    return { id: item.id, title: String(item.title).slice(0, 24), description: item.description ? String(item.description).slice(0, 72) : undefined };
  });
  return callMeta({
    messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'interactive',
    interactive: { type: 'list', body: { text: bodyText }, action: { button: buttonLabel.slice(0, 20), sections: [{ title: (sectionTitle || 'Options').slice(0, 24), rows }] } },
  });
}

function sendButtons(to, bodyText, buttons) {
  return callMeta({
    messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'interactive',
    interactive: { type: 'button', body: { text: bodyText }, action: { buttons: buttons.slice(0, 3).map(function(b) { return { type: 'reply', reply: { id: b.id, title: String(b.title).slice(0, 20) } }; }) } },
  });
}

function numberedBody(bodyText, items) {
  return bodyText + '\n\n' + items.map(function(item, i) { return (i + 1) + '. ' + item.title; }).join('\n');
}

/* ------------------------------------------------------------------ */
/* session — 5-minute inactivity timeout                              */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 5 * 60 * 1000;
const sessions = new Map();
const seenMessageIds = new Set();

function getSession(phone) {
  const existing = sessions.get(phone);
  if (existing && Date.now() - existing.updatedAt < SESSION_TTL_MS) return existing;
  const fresh = { step: 'init', profile: null, lang: existing ? existing.lang : null, draft: {}, updatedAt: Date.now(), expired: !!existing };
  sessions.set(phone, fresh);
  return fresh;
}
function saveSession(phone, session) { session.updatedAt = Date.now(); session.expired = false; sessions.set(phone, session); }
setInterval(function() {
  const now = Date.now();
  sessions.forEach(function(s, phone) { if (now - s.updatedAt > SESSION_TTL_MS) sessions.delete(phone); });
  if (seenMessageIds.size > 2000) seenMessageIds.clear();
}, 5 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* i18n — English + Kannada (Romanized to avoid Windows parse errors) */
/* ------------------------------------------------------------------ */

const MSG = {
  en: {
    chooseLang: 'Welcome to SevaLink!\n\nPlease choose your language.',
    welcome: 'Welcome to SevaLink.',
    sessionExpired: 'Your session timed out after 5 minutes. Starting fresh.',
    askName: 'You are new here. Please send your full name.',
    askEmail: 'Thanks. Please send your email address.',
    invalidEmail: 'That does not look like a valid email. Please try again.',
    profileCreated: function(name) { return 'Thanks ' + name + ', your account is set up.'; },
    chooseCategory: 'Please choose a category.',
    noCategories: 'No categories available right now. Please try again later.',
    chooseService: 'Please choose a service.',
    noServices: 'No services found in this category. Reply MENU to start over.',
    chooseProvider: 'Please choose a provider.',
    noProviders: 'No approved providers available for this service. Reply MENU to start over.',
    providerSummary: function(p) { return p.businessName + '\nRating: ' + (p.rating || 'Not rated yet') + '\nExperience: ' + (p.experience || 'Not specified') + '\nPrice: Rs. ' + p.price + '\n\nWhat would you like to do?'; },
    providerDetails: function(p) { return p.businessName + '\n\nAbout: ' + (p.about || 'No description.') + '\nExperience: ' + (p.experience || 'Not specified') + '\nRating: ' + (p.rating || 'Not rated yet') + '\nVerified: ' + (p.verified ? 'Yes' : 'No') + '\nPrice: Rs. ' + p.price; },
    askAddress: 'Please send the address where the service is needed.',
    askDate: 'Please enter the preferred date.\nFormat: DD/MM/YYYY  e.g. 25/09/2026',
    invalidDate: 'Invalid date. Please use DD/MM/YYYY format, e.g. 25/09/2026',
    askTime: 'Please enter the preferred time.\nFormat: HH:MM AM/PM  e.g. 10:30 AM  or 24h e.g. 14:30',
    invalidTime: 'Invalid time. Please use HH:MM AM/PM or 24h format.',
    confirmBooking: function(s) { return 'Please confirm your booking.\n\nService: ' + s.service + '\nProvider: ' + s.provider + '\nDate: ' + s.date + '\nTime: ' + s.time + '\nPrice: Rs. ' + s.price + '\nAddress: ' + s.address; },
    bookingCreated: function(code, s) { return 'Booking confirmed.\n\nCode: ' + code + '\nService: ' + s.service + '\nProvider: ' + s.provider + '\nDate: ' + s.date + '\nTime: ' + s.time + '\nStatus: Pending provider confirmation.'; },
    bookingFailed: 'Something went wrong while creating your booking. Please try again.',
    cancelled: 'Booking cancelled.',
    invalid: 'Sorry, I did not understand that. Please choose one of the options shown.',
    genericError: 'Something went wrong. Please try again in a moment.',
    noBookings: 'You have no recent bookings. Reply MENU to make a new booking.',
    chooseBooking: 'Here are your recent bookings. Select one to view details.',
    bookingDetail: function(b) { return 'Booking: ' + b.booking_code + '\nService: ' + b.service_title + '\nProvider: ' + b.provider_name + '\nDate: ' + (b.booking_date || 'Not set') + '\nTime: ' + (b.booking_time || 'Not set') + '\nStatus: ' + b.status + '\nAmount: Rs. ' + b.amount + '\nAddress: ' + b.address; },
    cannotCancel: function(status) { return 'This booking cannot be cancelled (status: "' + status + '"). Only pending or accepted bookings can be cancelled.'; },
    confirmCancel: 'Are you sure you want to cancel this booking?',
    cancelSuccess: function(code) { return 'Booking ' + code + ' has been cancelled successfully.'; },
    cancelFailed: 'Could not cancel the booking. Please try again.',
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
    mainMenuBody: function(name) { return 'Hello ' + name + '! How can we help you today?'; },
    mainMenuBodyNew: 'Welcome! What would you like to do?',
    menuBookService: 'Book a Service',
    menuMyBookings: 'My Bookings',
    menuHelp: 'Help',
    menuBookDesc: 'Find and book a service provider',
    menuBookingsDesc: 'View or cancel your bookings',
    menuHelpDesc: 'Learn how to use SevaLink',
    menuChooseBtn: 'Choose',
    menuLabel: 'Main Menu',
    helpText: 'Help:\n- Send "1" or "Book a Service" to find and book.\n- Send "2" or "My Bookings" to view or cancel bookings.\n- Send MENU at any time to return to this menu.',
  },

  // Kannada strings use Romanized transliteration (avoids Node.js v24 Windows
  // Unicode parsing bug with Kannada characters inside template literals).
  kn: {
    chooseLang: 'SevaLink ge swagata!\n\nDayavittu nimma bhashe ayke maDi.',
    welcome: 'SevaLink ge swagata.',
    sessionExpired: '5 nimisha pratikriye illadda karana session mugidide. Hosadagi arambisona.',
    askName: 'Neevu hosobaru. Dayavittu nimma purna hesarannu kaLuhisi.',
    askEmail: 'DhanyavAda. Dayavittu nimma email viLAsa kaLuhisi.',
    invalidEmail: 'Adu sariyadda email alla. Dayavittu matte kaLuhisi.',
    profileCreated: function(name) { return 'DhanyavAda ' + name + ', nimma khate siddhavagide.'; },
    chooseCategory: 'Dayavittu vargavannu ayke maDi.',
    noCategories: 'Iga yAvude vargagaLu labhyaville. SvaLpa samayadda nantar matte prayatnisi.',
    chooseService: 'Dayavittu seveyanne ayke maDi.',
    noServices: 'I vargadalli yAvude sevegaLu kandubandilla. MENU endo uttarisi.',
    chooseProvider: 'Dayavittu seva puraike dararannu ayke maDi.',
    noProviders: 'I sevege Iga yAvude anumodita puraike dararilla. MENU endo uttarisi.',
    providerSummary: function(p) { return p.businessName + '\nReting: ' + (p.rating || 'Ret agilla') + '\nAnubhava: ' + (p.experience || 'Namudisalagilla') + '\nBele: rU. ' + p.price + '\n\nNeevu Enu maDalu bayasuttiri?'; },
    providerDetails: function(p) { return p.businessName + '\n\nParicaya: ' + (p.about || 'Vivarane illa.') + '\nAnubhava: ' + (p.experience || 'Namudisalagilla') + '\nReting: ' + (p.rating || 'Ret agilla') + '\nParishilisalagide: ' + (p.verified ? 'Houdu' : 'Illa') + '\nBele: rU. ' + p.price; },
    askAddress: 'Seve bekagiruvA viLAsa kaLuhisi.',
    askDate: 'Adyateya dinanka namudisi.\nMadari: DD/MM/YYYY  udA: 25/09/2026',
    invalidDate: 'Adu sariyadda dinanka alla. DD/MM/YYYY madari baLasi.',
    askTime: 'Adyateya samaya namudisi.\nMadari: HH:MM AM/PM  udA: 10:30 AM',
    invalidTime: 'Adu sariyadda samaya alla. HH:MM AM/PM madari baLasi.',
    confirmBooking: function(s) { return 'Dayavittu nimma booking dhruDikarisi.\n\nSeve: ' + s.service + '\nPuraike dara: ' + s.provider + '\nDinanka: ' + s.date + '\nSamaya: ' + s.time + '\nBele: rU. ' + s.price + '\nViLAsa: ' + s.address; },
    bookingCreated: function(code, s) { return 'Booking dhruDikarisalagide.\n\nCode: ' + code + '\nSeve: ' + s.service + '\nPuraike dara: ' + s.provider + '\nDinanka: ' + s.date + '\nSamaya: ' + s.time + '\nSthiti: Puraike darada dhruDikaraNakkagi kayalaguttide.'; },
    bookingFailed: 'Booking maDuvaga tondareydita. Matte prayatnisi.',
    cancelled: 'Booking raddugomDisalagide.',
    invalid: 'KSamisi, nanage arthaAgalilla. Dayavittu torisidag aykegaLalli onnannu arisi.',
    genericError: 'Tondareydita. SvaLpa samayadda nantar matte prayatnisi.',
    noBookings: 'Nimma yAvude ittIcina bookingggaLilla. Hosa booking maDalu MENU endo uttarisi.',
    chooseBooking: 'Nimma ittIcina bookingggaLu illive. VivaraGAgAgi onnannu ayke maDi.',
    bookingDetail: function(b) { return 'Booking: ' + b.booking_code + '\nSeve: ' + b.service_title + '\nPuraike dara: ' + b.provider_name + '\nDinanka: ' + (b.booking_date || 'Namudisalagilla') + '\nSamaya: ' + (b.booking_time || 'Namudisalagilla') + '\nSthiti: ' + b.status + '\nMotta: rU. ' + b.amount + '\nViLAsa: ' + b.address; },
    cannotCancel: function(status) { return 'I booking raddugomDisalu sadyavilla (sthiti: "' + status + '"). KEvala baki athava svIkarisalAda bookings raddugomDisabahudu.'; },
    confirmCancel: 'Neevu khaNDitavAgi I booking raddugomDisalu bayasuttirA?',
    cancelSuccess: function(code) { return 'Booking ' + code + ' yasasviyAgi raddugomDisalagide.'; },
    cancelFailed: 'Booking raddugomDisalu sadyavagalilla. Matte prayatnisi.',
    btnBook: 'Book maDi',
    btnViewDetails: 'Vivara noDi',
    btnBack: 'Hinde',
    btnConfirm: 'DhruDikarisi',
    btnCancel: 'RaddumaDi',
    btnYes: 'Houdu, raddumaDi',
    btnNo: 'Illa, irali',
    btnOk: 'Sari',
    lblCategories: 'Vargagalu',
    lblServices: 'Sevegalu',
    lblProviders: 'Puraike dararu',
    lblBookings: 'Nanna booking',
    mainMenuBody: function(name) { return 'Namaskara ' + name + '! Nimage Enu sahAya beku?'; },
    mainMenuBodyNew: 'SwAgata! Neevu Enu maDalu bayasuttiri?',
    menuBookService: 'Seve book maDi',
    menuMyBookings: 'Nanna booking',
    menuHelp: 'SahAya',
    menuBookDesc: 'Seva puraike darannu huduki book maDi',
    menuBookingsDesc: 'Nimma bookings noDi athava raddu maDi',
    menuHelpDesc: 'SevaLink baLasuvA vidha tiLiyiri',
    menuChooseBtn: 'Ayke maDi',
    menuLabel: 'Menu',
    helpText: 'SahAya:\n- "1" endo athava "Seve book maDi" endo kaLuhisi.\n- "2" endo athava "Nanna booking" endo kaLuhisi.\n- MENU endo kaLuhisi - menu maraLi tereyalu.',
  },
};

function t(session, key) {
  const rest = Array.prototype.slice.call(arguments, 2);
  const lang = session.lang || 'en';
  const strings = MSG[lang] || MSG.en;
  const val = strings[key] !== undefined ? strings[key] : MSG.en[key];
  if (typeof val === 'function') return val.apply(null, rest);
  return val !== undefined ? val : key;
}

/* ------------------------------------------------------------------ */
/* data access                                                         */
/* ------------------------------------------------------------------ */

async function findProfileByPhone(rawPhone) {
  const digits = String(rawPhone).replace(/\D/g, '');
  const formatted = '+' + digits;
  const { data, error } = await adminClient.from('profiles').select('id, full_name, phone, role')
    .or('phone.eq.' + formatted + ',phone.eq.' + digits).limit(1).maybeSingle();
  if (error) console.warn('[findProfileByPhone]', error.message);
  return data || null;
}

async function createProfile(opts) {
  const phone = opts.phone, name = opts.name, email = opts.email;
  const digits = String(phone).replace(/\D/g, '');
  const formatted = '+' + digits;

  const { data: created, error: authError } = await adminClient.auth.admin.createUser({
    email,
    phone: formatted,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: name, source: 'whatsapp' },
  });

  let authUser = created && created.user;

  // A WhatsApp user may already exist in Supabase Auth even when the
  // createUser call returns "already registered". Resolve that real UUID
  // instead of inventing one, because profiles.id references auth.users.id.
  if (authError) {
    console.warn('[createUser]', authError.message);
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw new Error('Could not resolve the existing WhatsApp account: ' + listError.message);
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    authUser = (usersData.users || []).find((user) => {
      const userPhone = String(user.phone || '').replace(/\D/g, '');
      return (normalizedEmail && String(user.email || '').toLowerCase() === normalizedEmail)
        || (userPhone && (userPhone === digits || userPhone.endsWith(digits) || digits.endsWith(userPhone)));
    });
  }

  if (!authUser?.id) {
    throw new Error('Could not create or find the WhatsApp customer account.');
  }

  const { data: profile, error: upsertError } = await adminClient
    .from('profiles')
    .upsert({
      id: authUser.id,
      full_name: name,
      phone: formatted,
      role: 'customer',
      approval_status: 'approved',
    })
    .select('id, full_name, phone, role')
    .single();

  if (upsertError) {
    console.warn('[profiles upsert]', upsertError.message);
    throw upsertError;
  }

  return profile;
}
async function fetchCategories() {
  const { data, error } = await adminClient.from('categories').select('id, name, description').order('name').limit(9);
  if (error) console.warn('[fetchCategories]', error.message);
  return data || [];
}

async function fetchServices(categoryId) {
  const { data, error } = await adminClient.from('services').select('id, name, description').eq('category_id', categoryId).order('name').limit(9);
  if (error) console.warn('[fetchServices]', error.message);
  return data || [];
}

// Approval is checked via providers.status = 'approved' (NOT profiles.approval_status)
async function fetchProviders(serviceId) {
  const { data, error } = await adminClient.from('provider_services')
    .select('price, provider_id, providers!inner(id, business_name, rating, experience, about, verified, status, certificates, image_url)')
    .eq('service_id', serviceId).eq('providers.status', 'approved').limit(9);
  if (error) { console.warn('[fetchProviders]', error.message); return []; }
  if (data.length === 0) {
    const { data: unfiltered } = await adminClient.from('provider_services').select('provider_id, providers(business_name, status)').eq('service_id', serviceId);
    if (!unfiltered || unfiltered.length === 0) console.warn('[fetchProviders] No providers linked to service_id=' + serviceId);
    else console.warn('[fetchProviders] Providers exist but none approved. Statuses: ' + unfiltered.map(function(r) { return (r.providers && r.providers.business_name) + ': ' + (r.providers && r.providers.status); }).join(', '));
    return [];
  }
  return data.map(function(row) {
    return { providerId: row.provider_id, price: row.price, businessName: row.providers.business_name, rating: row.providers.rating, experience: row.providers.experience, about: row.providers.about, verified: row.providers.verified, certificates: row.providers.certificates || [], imageUrl: row.providers.image_url || '' };
  });
}

async function fetchCustomerBookings(customerId) {
  const { data, error } = await adminClient.from('bookings')
    .select('id, booking_code, service_title, provider_name, status, booking_date, booking_time, amount, address')
    .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(5);
  if (error) { console.warn('[fetchCustomerBookings]', error.message); return []; }
  return data || [];
}

async function cancelBooking(bookingId, customerId) {
  const { data: existing, error: fetchErr } = await adminClient.from('bookings')
    .select('id, status, booking_code, customer_id').eq('id', bookingId).eq('customer_id', customerId).maybeSingle();
  if (fetchErr || !existing) { console.warn('[cancelBooking] fetch error:', fetchErr && fetchErr.message); return { success: false, status: null }; }
  if (!['pending', 'accepted'].includes(existing.status)) return { success: false, status: existing.status };
  const { error: updateErr } = await adminClient.from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingId).eq('customer_id', customerId);
  if (updateErr) { console.warn('[cancelBooking] update error:', updateErr.message); return { success: false, status: existing.status }; }
  return { success: true, bookingCode: existing.booking_code };
}

async function getProviderPhone(providerId) {
  const { data, error } = await adminClient.from('providers').select('user_id, profiles!inner(phone)').eq('id', providerId).maybeSingle();
  if (error) { console.warn('[getProviderPhone]', error.message); return null; }
  return (data && data.profiles && data.profiles.phone) || null;
}

async function notifyProvider(providerId, bookingCode) {
  try {
    const providerPhone = await getProviderPhone(providerId);
    if (!providerPhone) { console.warn('[notifyProvider] No phone for provider ' + providerId); return; }
    const digits = String(providerPhone).replace(/\D/g, '');
    const to = digits.startsWith('0') ? '91' + digits.slice(1) : digits;
    await sendText(to, 'You have a new booking! (Code: ' + bookingCode + ')\n\nVisit your dashboard:\n' + PROVIDER_WEBSITE);
    console.log('[notifyProvider] Alert sent to ' + to);
  } catch (err) { console.error('[notifyProvider]', err.message); }
}

async function createBooking(opts) {
  const customerId = opts.customerId, customerName = opts.customerName, customerPhone = opts.customerPhone, provider = opts.provider, service = opts.service, address = opts.address, bookingDate = opts.bookingDate, bookingTime = opts.bookingTime;
  let scheduledDate;
  try {
    scheduledDate = new Date(bookingDate + 'T' + bookingTime + ':00');
    if (isNaN(scheduledDate.getTime())) throw new Error('Invalid');
  } catch (e) { scheduledDate = new Date(Date.now() + 86400000); scheduledDate.setHours(10, 0, 0, 0); }
  let validCustomerId = customerId;
  const { data: customerProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', customerId)
    .maybeSingle();

  if (!customerProfile) {
    validCustomerId = null;
  }

  if (!customerProfile && customerPhone) {
    const recoveredProfile = await findProfileByPhone(customerPhone);
    if (recoveredProfile) validCustomerId = recoveredProfile.id;
  }

  if (!validCustomerId) {
    throw new Error('WhatsApp customer profile was not found.');
  }
  const { data, error } = await adminClient.from('bookings').insert({
    service_id: service.id, customer_id: validCustomerId, provider_id: provider.providerId,
    service_title: service.name, provider_name: provider.businessName, customer_name: customerName,
    scheduled_date: scheduledDate.toISOString(), booking_date: bookingDate, booking_time: bookingTime,
    status: 'pending', amount: provider.price, address,
  }).select('id, booking_code').single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* date / time helpers                                                 */
/* ------------------------------------------------------------------ */

function parseDate(text) {
  var m = text.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) { var iso = m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0'); if (!isNaN(new Date(iso).getTime())) return iso; }
  m = text.trim().match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (m) { var iso2 = m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0'); if (!isNaN(new Date(iso2).getTime())) return iso2; }
  return null;
}

function parseTime(text) {
  var m = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (m) { var h = parseInt(m[1],10); var mn = m[2]; if (m[3].toLowerCase()==='pm' && h!==12) h+=12; if (m[3].toLowerCase()==='am' && h===12) h=0; if (h>=0&&h<24&&parseInt(mn)<60) return String(h).padStart(2,'0')+':'+mn; }
  m = text.trim().match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (m) { var h2=parseInt(m[1],10); var mn2=parseInt(m[2],10); if (h2>=0&&h2<24&&mn2>=0&&mn2<60) return String(h2).padStart(2,'0')+':'+String(mn2).padStart(2,'0'); }
  return null;
}

function prettyDate(iso) { if (!iso) return 'Not set'; var p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function prettyTime(t24) { if (!t24) return 'Not set'; var p=t24.split(':'); var h=parseInt(p[0],10); return (h%12||12)+':'+p[1]+' '+(h<12?'AM':'PM'); }

/* ------------------------------------------------------------------ */
/* keyword detection                                                   */
/* ------------------------------------------------------------------ */

const GREETINGS_EN = ['hi','hey','hello','start','menu'];
const MYBOOKINGS_EN = ['my bookings','bookings','my booking','view bookings','view booking'];

function isGreeting(inbound) {
  if (inbound.kind !== 'text') return false;
  return GREETINGS_EN.includes(inbound.text.toLowerCase().trim());
}
function isMyBookings(inbound) {
  if (inbound.kind !== 'text') return false;
  return MYBOOKINGS_EN.includes(inbound.text.toLowerCase().trim());
}

/* ------------------------------------------------------------------ */
/* inbound parsing                                                     */
/* ------------------------------------------------------------------ */

function parseInbound(message) {
  if (message.type === 'text') return { kind: 'text', text: (message.text && message.text.body || '').trim() };
  if (message.type === 'interactive') {
    var i = message.interactive;
    if (i.type === 'list_reply') return { kind: 'list_reply', id: i.list_reply.id, title: i.list_reply.title };
    if (i.type === 'button_reply') return { kind: 'button_reply', id: i.button_reply.id, title: i.button_reply.title };
  }
  return { kind: 'unknown' };
}

function resolveChoice(inbound, choices) {
  if (inbound.kind === 'list_reply' || inbound.kind === 'button_reply') return choices.find(function(c) { return c.id === inbound.id; }) || null;
  if (inbound.kind === 'text') { var n = Number(inbound.text.trim()); if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n-1]; }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* show helpers                                                        */
/* ------------------------------------------------------------------ */

async function showMainMenu(phone, session, wasInvalid) {
  const name = session.profile && session.profile.full_name;
  const bodyText = wasInvalid ? t(session, 'invalid')
    : name ? t(session, 'mainMenuBody', name) : t(session, 'mainMenuBodyNew');
  session.step = 'main_menu';
  saveSession(phone, session);
  const items = [
    { id: 'menu_book',     title: t(session, 'menuBookService'), description: t(session, 'menuBookDesc') },
    { id: 'menu_bookings', title: t(session, 'menuMyBookings'),  description: t(session, 'menuBookingsDesc') },
    { id: 'menu_help',     title: t(session, 'menuHelp'),        description: t(session, 'menuHelpDesc') },
  ];
  return sendList(phone, numberedBody(bodyText, items), t(session, 'menuChooseBtn'), items, t(session, 'menuLabel'));
}

async function showCategories(phone, session, wasInvalid) {
  const categories = await fetchCategories();
  if (categories.length === 0) return sendText(phone, t(session, 'noCategories'));
  const items = categories.map(function(c) { return { id: c.id, title: c.name, description: c.description || '' }; });
  session.draft.categories = items; session.step = 'categories'; saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session,'invalid')+' '+t(session,'chooseCategory') : t(session,'chooseCategory'), items);
  return sendList(phone, body, t(session,'menuChooseBtn'), items, t(session,'lblCategories'));
}

async function showServices(phone, session, wasInvalid) {
  const services = await fetchServices(session.draft.category.id);
  if (services.length === 0) return sendText(phone, t(session, 'noServices'));
  const items = services.map(function(s) { return { id: s.id, title: s.name, description: s.description || '' }; });
  session.draft.services = items; session.step = 'services'; saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session,'invalid')+' '+t(session,'chooseService') : t(session,'chooseService'), items);
  return sendList(phone, body, t(session,'menuChooseBtn'), items, t(session,'lblServices'));
}

async function showProviders(phone, session, wasInvalid) {
  const providers = await fetchProviders(session.draft.service.id);
  if (providers.length === 0) return sendText(phone, t(session, 'noProviders'));
  const items = providers.map(function(p) { return { id: p.providerId, title: p.businessName, description: 'Rating ' + (p.rating||'NA') + ' - Rs. ' + p.price, _full: p }; });
  session.draft.providers = items.map(function(i) { return Object.assign({}, i, i._full); });
  session.step = 'providers'; saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session,'invalid')+' '+t(session,'chooseProvider') : t(session,'chooseProvider'), items);
  return sendList(phone, body, t(session,'menuChooseBtn'), items, t(session,'lblProviders'));
}

async function showMyBookings(phone, session, wasInvalid) {
  const bookings = await fetchCustomerBookings(session.profile.id);
  if (bookings.length === 0) return sendText(phone, t(session, 'noBookings'));
  const items = bookings.map(function(b) { return Object.assign({ id: b.id, title: b.booking_code, description: (b.service_title + ' - ' + b.status).slice(0,72) }, b); });
  session.draft.bookingList = items; session.step = 'view_bookings'; saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session,'invalid')+' '+t(session,'chooseBooking') : t(session,'chooseBooking'), items);
  return sendList(phone, body, t(session,'menuChooseBtn'), items, t(session,'lblBookings'));
}

async function showBookingDetail(phone, session) {
  const bk = session.draft.selectedBooking;
  const detailText = t(session, 'bookingDetail', bk);
  if (['pending','accepted'].includes(bk.status)) {
    return sendButtons(phone, detailText, [
      { id: 'cancel_booking', title: t(session,'btnCancel') },
      { id: 'back_to_bookings', title: t(session,'btnBack') },
    ]);
  }
  return sendButtons(phone, detailText, [
    { id: 'ok_done', title: t(session,'btnOk') },
    { id: 'back_to_bookings', title: t(session,'btnBack') },
  ]);
}

/* ------------------------------------------------------------------ */
/* main flow handler                                                   */
/* ------------------------------------------------------------------ */

async function handleMessage(opts) {
  const phone = opts.phone, inbound = opts.inbound;
  const session = getSession(phone);
  const wasExpired = session.expired;

  // Global: greeting resets to init
  if (isGreeting(inbound)) { session.step = 'init'; session.draft = {}; saveSession(phone, session); }

  // Global: MY BOOKINGS from any step (except booking sub-steps)
  const bookingSubSteps = ['view_bookings','booking_selected','cancel_confirm'];
  if (isMyBookings(inbound) && !bookingSubSteps.includes(session.step) && session.profile) {
    session.step = 'view_bookings'; session.draft.bookingList = null; saveSession(phone, session);
    return showMyBookings(phone, session);
  }

  // Entry point
  if (session.step === 'init') {
    if (wasExpired && !isGreeting(inbound)) await sendText(phone, t(session,'sessionExpired'));
    if (!session.lang) {
      session.step = 'choose_lang'; saveSession(phone, session);
      return sendButtons(phone, MSG.en.chooseLang, [{ id:'lang_en', title:'English' }, { id:'lang_kn', title:'Kannada' }]);
    }
    await sendText(phone, t(session,'welcome'));
    let profile = session.profile || await findProfileByPhone(phone);
    if (profile) { session.profile = profile; return showMainMenu(phone, session); }
    session.step = 'onboard_name'; session.draft = { name:null, email:null }; saveSession(phone, session);
    return sendText(phone, t(session,'askName'));
  }

  const btnId = function(ib) { return ib.kind==='button_reply' ? ib.id : ib.kind==='list_reply' ? ib.id : ib.kind==='text' ? ib.text.toLowerCase().trim() : ''; };

  switch (session.step) {

    case 'choose_lang': {
      const id = btnId(inbound);
      session.lang = (id==='lang_kn'||id==='kn'||id==='kannada') ? 'kn' : 'en';
      session.step = 'init'; saveSession(phone, session);
      await sendText(phone, t(session,'welcome'));
      let profile = session.profile || await findProfileByPhone(phone);
      if (profile) { session.profile = profile; return showMainMenu(phone, session); }
      session.step = 'onboard_name'; session.draft = { name:null, email:null }; saveSession(phone, session);
      return sendText(phone, t(session,'askName'));
    }

    case 'onboard_name': {
      if (inbound.kind !== 'text' || inbound.text.length < 2) return sendText(phone, t(session,'askName'));
      session.draft.name = inbound.text; session.step = 'onboard_email'; saveSession(phone, session);
      return sendText(phone, t(session,'askEmail'));
    }

    case 'onboard_email': {
      if (inbound.kind !== 'text' || !EMAIL_RE.test(inbound.text)) return sendText(phone, t(session,'invalidEmail'));
      const profile = await createProfile({ phone, name: session.draft.name, email: inbound.text });
      session.profile = profile; session.step = 'main_menu'; session.draft = {}; saveSession(phone, session);
      await sendText(phone, t(session,'profileCreated', profile.full_name));
      return showMainMenu(phone, session);
    }

    case 'main_menu': {
      const id = btnId(inbound);
      if (id==='menu_book'||id==='1') { session.step='categories'; saveSession(phone,session); return showCategories(phone,session); }
      if (id==='menu_bookings'||id==='2') {
        if (!session.profile) return showMainMenu(phone,session,true);
        session.step='view_bookings'; session.draft.bookingList=null; saveSession(phone,session); return showMyBookings(phone,session);
      }
      if (id==='menu_help'||id==='3') { await sendText(phone, t(session,'helpText')); return showMainMenu(phone,session); }
      return showMainMenu(phone, session, true);
    }

    case 'categories': {
      const choice = resolveChoice(inbound, session.draft.categories||[]);
      if (!choice) return showCategories(phone,session,true);
      session.draft.category = choice; session.step='services'; saveSession(phone,session);
      return showServices(phone,session);
    }

    case 'services': {
      const choice = resolveChoice(inbound, session.draft.services||[]);
      if (!choice) return showServices(phone,session,true);
      session.draft.service = choice; session.step='providers'; saveSession(phone,session);
      return showProviders(phone,session);
    }

    case 'providers': {
      const choice = resolveChoice(inbound, session.draft.providers||[]);
      if (!choice) return showProviders(phone,session,true);
      session.draft.provider = choice; session.step='provider_action'; saveSession(phone,session);
      return sendButtons(phone, t(session,'providerSummary',choice), [
        { id:'book_now', title:t(session,'btnBook') },
        { id:'view_details', title:t(session,'btnViewDetails') },
      ]);
    }

    case 'provider_action': {
      const id = btnId(inbound);
      if (id==='view_details'||id==='2') {
        session.step='provider_details'; saveSession(phone,session);
        const prov = session.draft.provider;
        if (prov.imageUrl) await sendImage(phone, prov.imageUrl, prov.businessName);
        return sendButtons(phone, t(session,'providerDetails',prov), [
          { id:'book_now', title:t(session,'btnBook') },
          { id:'back_to_providers', title:t(session,'btnBack') },
        ]);
      }
      if (id==='book_now'||id==='1') { session.step='await_address'; saveSession(phone,session); return sendText(phone,t(session,'askAddress')); }
      return sendButtons(phone, t(session,'invalid'), [{ id:'book_now', title:t(session,'btnBook') }, { id:'view_details', title:t(session,'btnViewDetails') }]);
    }

    case 'provider_details': {
      const id = btnId(inbound);
      if (id==='book_now'||id==='1') { session.step='await_address'; saveSession(phone,session); return sendText(phone,t(session,'askAddress')); }
      if (id==='back_to_providers') { session.step='providers'; saveSession(phone,session); return showProviders(phone,session); }
      return sendButtons(phone, t(session,'invalid'), [{ id:'book_now', title:t(session,'btnBook') }, { id:'back_to_providers', title:t(session,'btnBack') }]);
    }

    case 'await_address': {
      if (inbound.kind!=='text'||inbound.text.length<5) return sendText(phone,t(session,'askAddress'));
      session.draft.address=inbound.text; session.step='await_date'; saveSession(phone,session);
      return sendText(phone,t(session,'askDate'));
    }

    case 'await_date': {
      if (inbound.kind!=='text') return sendText(phone,t(session,'invalidDate'));
      const dateIso = parseDate(inbound.text);
      if (!dateIso) return sendText(phone,t(session,'invalidDate'));
      session.draft.bookingDate=dateIso; session.step='await_time'; saveSession(phone,session);
      return sendText(phone,t(session,'askTime'));
    }

    case 'await_time': {
      if (inbound.kind!=='text') return sendText(phone,t(session,'invalidTime'));
      const time24=parseTime(inbound.text);
      if (!time24) return sendText(phone,t(session,'invalidTime'));
      session.draft.bookingTime=time24; session.step='confirm_booking'; saveSession(phone,session);
      return sendButtons(phone, t(session,'confirmBooking',{
        service: session.draft.service.title, provider: session.draft.provider.businessName,
        date: prettyDate(session.draft.bookingDate), time: prettyTime(session.draft.bookingTime),
        price: session.draft.provider.price, address: session.draft.address,
      }), [{ id:'confirm_yes', title:t(session,'btnConfirm') }, { id:'confirm_no', title:t(session,'btnCancel') }]);
    }

    case 'confirm_booking': {
      const id = btnId(inbound);
      if (id==='confirm_no'||id==='2') {
        session.step='main_menu'; session.draft={}; saveSession(phone,session);
        await sendText(phone,t(session,'cancelled')); return showMainMenu(phone,session);
      }
      if (id!=='confirm_yes'&&id!=='1') return sendButtons(phone,t(session,'invalid'),[{ id:'confirm_yes', title:t(session,'btnConfirm') },{ id:'confirm_no', title:t(session,'btnCancel') }]);
      try {
        const booking = await createBooking({ customerId:session.profile.id, customerPhone:phone, customerName:session.profile.full_name, provider:session.draft.provider, service:session.draft.service, address:session.draft.address, bookingDate:session.draft.bookingDate, bookingTime:session.draft.bookingTime });
        await sendText(phone, t(session,'bookingCreated', booking.booking_code, { service:session.draft.service.title, provider:session.draft.provider.businessName, date:prettyDate(session.draft.bookingDate), time:prettyTime(session.draft.bookingTime) }));
        await notifyProvider(session.draft.provider.providerId, booking.booking_code);
      } catch(err) { console.error('[createBooking]', err.message); await sendText(phone,t(session,'bookingFailed')); }
      session.step='main_menu'; session.draft={}; saveSession(phone,session);
      return showMainMenu(phone,session);
    }

    case 'view_bookings': {
      const choice = resolveChoice(inbound, session.draft.bookingList||[]);
      if (!choice) return showMyBookings(phone,session,true);
      session.draft.selectedBooking = choice; session.step='booking_selected'; saveSession(phone,session);
      return showBookingDetail(phone,session);
    }

    case 'booking_selected': {
      const id = btnId(inbound);
      if (id==='cancel_booking') {
        const bk = session.draft.selectedBooking;
        if (!['pending','accepted'].includes(bk.status)) {
          await sendText(phone, t(session,'cannotCancel', bk.status));
          session.step='view_bookings'; saveSession(phone,session); return showMyBookings(phone,session);
        }
        session.step='cancel_confirm'; saveSession(phone,session);
        return sendButtons(phone, t(session,'confirmCancel'), [{ id:'yes_cancel', title:t(session,'btnYes') }, { id:'no_keep', title:t(session,'btnNo') }]);
      }
      if (id==='back_to_bookings') { session.step='view_bookings'; saveSession(phone,session); return showMyBookings(phone,session); }
      if (id==='ok_done') { session.step='main_menu'; session.draft={}; saveSession(phone,session); return showMainMenu(phone,session); }
      return showBookingDetail(phone,session);
    }

    case 'cancel_confirm': {
      const id = btnId(inbound);
      if (id==='yes_cancel'||id==='1') {
        const bk = session.draft.selectedBooking;
        const result = await cancelBooking(bk.id, session.profile.id);
        await sendText(phone, result.success ? t(session,'cancelSuccess',result.bookingCode) : (result.status ? t(session,'cannotCancel',result.status) : t(session,'cancelFailed')));
        session.step='main_menu'; session.draft={}; saveSession(phone,session); return showMainMenu(phone,session);
      }
      if (id==='no_keep'||id==='2') { session.step='booking_selected'; saveSession(phone,session); return showBookingDetail(phone,session); }
      return sendButtons(phone, t(session,'confirmCancel'), [{ id:'yes_cancel', title:t(session,'btnYes') }, { id:'no_keep', title:t(session,'btnNo') }]);
    }

    default: {
      session.step = 'init'; saveSession(phone, session);
      if (session.profile && session.lang) return showMainMenu(phone, session);
      return sendText(phone, MSG.en.welcome);
    }
  }
}

/* ------------------------------------------------------------------ */
/* webhook server                                                       */
/* ------------------------------------------------------------------ */

async function processInbound(body) {
  const value = body && body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value;
  const message = value && value.messages && value.messages[0];
  if (!message) return;
  if (seenMessageIds.has(message.id)) { console.log('Duplicate ignored:', message.id); return; }
  seenMessageIds.add(message.id);
  const contact = value.contacts && value.contacts[0];
  const phone = message.from;
  const waName = (contact && contact.profile && contact.profile.name) || 'Customer';
  const inbound = parseInbound(message);
  console.log('\nInbound from ' + waName + ' (' + phone + '):', inbound);
  try { await handleMessage({ phone, waName, inbound }); }
  catch (err) { console.error('Handler error:', err); await sendText(phone, MSG.en.genericError); }
}

const server = http.createServer(function(req, res) {
  const parsedUrl = new URL(req.url, 'http://' + req.headers.host);
  if (req.method === 'GET') {
    const mode = parsedUrl.searchParams.get('hub.mode');
    const token = parsedUrl.searchParams.get('hub.verify_token');
    const challenge = parsedUrl.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) { console.log('Webhook verified'); res.writeHead(200,{'Content-Type':'text/plain'}); return res.end(challenge); }
    res.writeHead(403); return res.end('Forbidden');
  }
  if (req.method === 'POST') {
    let bodyText = '';
    req.on('data', function(chunk) { bodyText += chunk; });
    req.on('end', function() {
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({received:true}));
      let body;
      try { body = JSON.parse(bodyText||'{}'); } catch(err) { console.error('Bad JSON:', err.message); return; }
      processInbound(body).catch(function(err) { console.error('processInbound:', err); });
    });
    return;
  }
  res.writeHead(405,{'Content-Type':'text/plain'}); res.end('Method Not Allowed');
});

server.listen(PORT, function() {
  console.log('\nSevaLink WhatsApp server -> http://localhost:' + PORT);
  console.log('Verify token: ' + VERIFY_TOKEN);
  console.log(WHATSAPP_ACCESS_TOKEN ? 'Token loaded (' + WHATSAPP_ACCESS_TOKEN.length + ' chars)' : 'No token — mock mode (replies print to console)');
  console.log('Languages: English + Kannada (Romanized)');
  console.log('Session timeout: 5 minutes');
  console.log('Press Ctrl+C to stop.\n');
});