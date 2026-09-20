const http = require('http');
const fs = require('fs');
const path = require('path');
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch {
  createClient = require(path.join(__dirname, '../../../website/node_modules/@supabase/supabase-js')).createClient;
}

// Load environment variables from supabase/functions/.env if available
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const [key, ...valueArr] = line.split('=');
    if (key && valueArr.length > 0) {
      process.env[key.trim()] = valueArr.join('=').trim();
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://giygtxqatkrgjeuojgma.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1321392541053558';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sevalink_whatsapp_secret_sudeep';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendWhatsAppMessage(to, messageBody) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log('[Mock Outbound WhatsApp Message to ' + to + ']:\n' + messageBody);
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
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { preview_url: false, body: messageBody },
      }),
    });
    const data = await res.json();
    console.log('[Meta API Outbound Status]:', res.status, data);
    return data;
  } catch (err) {
    console.error('[Meta Outbound Fetch Error]:', err.message);
  }
}

async function findOrCreateCustomer(rawPhone, contactName) {
  const digits = rawPhone.replace(/\D/g, '');
  const formattedPhone = digits.startsWith('+') ? digits : `+${digits}`;

  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role')
    .or(`phone.eq.${formattedPhone},phone.eq.${digits}`)
    .maybeSingle();

  if (existingProfile) {
    console.log('✅ Found existing customer profile ID:', existingProfile.id);
    return existingProfile.id;
  }

  console.log('✨ Creating new user profile for phone:', formattedPhone);
  const dummyEmail = `wa_${digits}@sevalink.app`;
  const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: dummyEmail,
    phone: formattedPhone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: contactName || 'WhatsApp Customer', source: 'whatsapp' },
  });

  let userId = authUser?.user?.id || crypto.randomUUID();

  await adminClient.from('profiles').upsert({
    id: userId,
    full_name: contactName || 'WhatsApp Customer',
    phone: formattedPhone,
    role: 'customer',
    approval_status: 'approved',
  });

  return userId;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // 1. GET: Webhook verification
  if (req.method === 'GET') {
    const mode = parsedUrl.searchParams.get('hub.mode');
    const token = parsedUrl.searchParams.get('hub.verify_token');
    const challenge = parsedUrl.searchParams.get('hub.challenge');

    console.log('\n[GET Verification Request]:', { mode, token });
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verification successful!');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(challenge);
    }
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // 2. POST: Inbound Message
  if (req.method === 'POST') {
    let bodyText = '';
    req.on('data', (chunk) => (bodyText += chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyText || '{}');
        console.log('\n📩 [Inbound Webhook Received]:', JSON.stringify(body, null, 2));

        const entry = body?.entry?.[0];
        const message = entry?.changes?.[0]?.value?.messages?.[0];
        const contact = entry?.changes?.[0]?.value?.contacts?.[0];

        if (!message) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'ignored' }));
        }

        const fromNumber = message.from;
        const contactName = contact?.profile?.name || 'Customer';
        const textBody = (message?.text?.body || '').trim().toLowerCase();

        console.log(`\n💬 Customer (${contactName} - ${fromNumber}) sent: "${textBody}"`);

        const customerId = await findOrCreateCustomer(fromNumber, contactName);

        if (textBody === 'hi' || textBody === 'hello' || textBody === 'help') {
          const { data: services } = await adminClient.from('services').select('name').limit(5);
          const serviceListText = (services || []).map((s, idx) => `*${idx + 1}. ${s.name}*`).join('\n');

          const reply = `👋 *Welcome to SevaLink Services!*\n\nHi ${contactName}, available services:\n\n${serviceListText || '1. Cleaning\n2. Nursing'}\n\nReply *BOOK <Service Name>* to book instantly!`;
          await sendWhatsAppMessage(fromNumber, reply);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, action: 'sent_welcome' }));
        }

        if (textBody.startsWith('book') || textBody.includes('booking')) {
          const serviceTitle = textBody.replace(/^book\s*/i, '').trim() || 'Cleaning';
          const bookingCode = `BK-${Math.floor(10000 + Math.random() * 90000)}`;

          const { data: newBooking, error: bookingError } = await adminClient
            .from('bookings')
            .insert({
              booking_code: bookingCode,
              customer_id: customerId,
              service_title: serviceTitle,
              customer_name: contactName,
              scheduled_date: new Date(Date.now() + 86400000).toISOString(),
              status: 'pending',
              amount: 500,
              address: 'WhatsApp Address',
            })
            .select('id, booking_code')
            .single();

          if (bookingError) {
            console.error('❌ Booking Creation Error:', bookingError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: bookingError.message }));
          }

          console.log('🎉 Created Booking in Supabase:', newBooking);

          const reply = `✅ *Booking Confirmed!*\nCode: ${bookingCode}\nService: ${serviceTitle}\nStatus: Pending Provider Confirmation.`;
          await sendWhatsAppMessage(fromNumber, reply);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, booking: newBooking }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, action: 'default_reply' }));
      } catch (err) {
        console.error('❌ Error handling POST:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Node.js WhatsApp Local Server running on http://localhost:${PORT}`);
  console.log(`📬 Webhook URL: http://localhost:${PORT}/`);
  console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
  console.log(`Press Ctrl+C to stop.\n`);
});
