'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch {
  createClient = require(path.join(__dirname, '../../../website/node_modules/@supabase/supabase-js')).createClient;
}

// Load the same local environment file used by whatsapp-booking/local-server.js.
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const separator = line.indexOf('=');
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/\r$/, '').replace(/^['"](.*)['"]$/, '$1');
    if (key) process.env[key] = value;
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://giygtxqatkrgjeuojgma.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
const WHATSAPP_ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const PORT = Number(process.env.RAZORPAY_WEBHOOK_PORT || 3002);

function logEvent(message, details) {
  console.log('[razorpay-webhook] ' + new Date().toISOString() + ' ' + message + (details ? ' ' + JSON.stringify(details) : ''));
}

if (!SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in supabase/functions/.env.');
if (!RAZORPAY_WEBHOOK_SECRET) throw new Error('Missing RAZORPAY_WEBHOOK_SECRET in supabase/functions/.env.');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(res, body, status) {
  res.writeHead(status || 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function verifySignature(rawBody, signature) {
  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(String(signature || ''), 'utf8');
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function digits(phone) {
  const value = String(phone || '').replace(/\D/g, '');
  return value.startsWith('0') ? '91' + value.slice(1) : value;
}

async function sendWhatsApp(to, body) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID || !to) {
    logEvent('WhatsApp notification skipped', { configured: Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_ID), recipient: Boolean(to) });
    return;
  }
  logEvent('Sending WhatsApp notification', { recipient: to });
  await fetch('https://graph.facebook.com/v25.0/' + WHATSAPP_PHONE_ID + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + WHATSAPP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text',
      text: { preview_url: false, body },
    }),
  });
}

async function handleWebhook(rawBody, signature) {
  if (!verifySignature(rawBody, signature)) return { body: { error: 'Invalid signature' }, status: 401 };

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return { body: { error: 'Invalid JSON' }, status: 400 }; }
  const event = payload.event || '';
  if (!['payment_link.paid', 'payment.captured'].includes(event)) return { body: { received: true }, status: 200 };

  const link = (payload.payload && payload.payload.payment_link && payload.payload.payment_link.entity) || {};
  const payment = (payload.payload && payload.payload.payment && payload.payload.payment.entity) || {};
  const bookingId = link.reference_id || (link.notes && link.notes.booking_id) || (payment.notes && payment.notes.booking_id) || '';
  const paymentId = payment.id || link.payment_id || '';
  logEvent('Payment identifiers extracted', { bookingId, paymentId, event });
  if (!bookingId || !paymentId) return { body: { error: 'Booking or payment id missing' }, status: 400 };

  const { data: booking, error: bookingError } = await supabase.from('bookings')
    .select('id, booking_code, customer_id, provider_id, amount, payment_status')
    .eq('id', bookingId).single();
  if (bookingError || !booking) return { body: { error: 'Booking not found' }, status: 404 };
  if (booking.payment_status === 'paid') {
    logEvent('Duplicate paid webhook ignored', { bookingId: booking.id, bookingCode: booking.booking_code });
    return { body: { received: true, duplicate: true }, status: 200 };
  }

  const amountPaise = payment.amount || link.amount_paid || link.amount || 0;
  logEvent('Payment loaded', { bookingId: booking.id, bookingCode: booking.booking_code, amountPaise, paymentId });
  if (amountPaise && Math.round(Number(booking.amount) * 100) !== Number(amountPaise)) {
    return { body: { error: 'Payment amount mismatch' }, status: 400 };
  }

  const { data: savedPayment, error: paymentError } = await supabase.from('payments').upsert({
    booking_id: booking.id,
    razorpay_payment_id: paymentId,
    razorpay_order_id: payment.order_id || link.order_id || '',
    razorpay_signature: signature,
    amount: Number(amountPaise) / 100,
    currency: payment.currency || 'INR',
    status: 'captured',
    payment_method: payment.method || 'razorpay',
    payment_metadata: payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'booking_id' }).select('id').single();
  if (paymentError) return { body: { error: paymentError.message }, status: 500 };

  const { error: updateError } = await supabase.from('bookings').update({
    payment_id: savedPayment.id,
    payment_status: 'paid',
    status: 'pending',
    updated_at: new Date().toISOString(),
  }).eq('id', booking.id);
  if (updateError) return { body: { error: updateError.message }, status: 500 };

  logEvent('Booking marked paid', { bookingId: booking.id, bookingCode: booking.booking_code, paymentId });
  const { data: customer } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).maybeSingle();
  await sendWhatsApp(digits(customer && customer.phone), 'Payment received for booking ' + booking.booking_code + '. Your payment is done and we are waiting for provider confirmation.');
  return { body: { received: true }, status: 200 };
}

const server = http.createServer((req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  logEvent('API request received', { requestId, method: req.method, path: req.url, remoteAddress: req.socket.remoteAddress });

  if (req.method !== 'POST') {
    logEvent('API request rejected', { requestId, status: 405 });
    return json(res, { error: 'Method not allowed' }, 405);
  }

  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', async () => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      logEvent('Webhook body received', { requestId, bodyBytes: Buffer.byteLength(rawBody, 'utf8'), signaturePresent: Boolean(signature) });
      const result = await handleWebhook(rawBody, signature);
      logEvent('API request completed', { requestId, status: result.status, durationMs: Date.now() - startedAt });
      json(res, result.body, result.status);
    } catch (error) {
      logEvent('API request failed', { requestId, status: 500, durationMs: Date.now() - startedAt, error: error.message });
      console.error('[razorpay-webhook]', error);
      json(res, { error: 'Webhook processing failed' }, 500);
    }
  });
});

server.listen(PORT, () => {
  logEvent('Server started', { port: PORT, endpoint: '/razorpay-webhook' });
  console.log('Razorpay webhook local server: http://localhost:' + PORT);
  console.log('POST endpoint: http://localhost:' + PORT + '/razorpay-webhook');
});