import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function hexToBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return new Uint8Array();
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
}

async function verifySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const actual = hexToBytes(signature);
  return actual.length === digest.length && actual.every((value, index) => value === digest[index]);
}

function digits(phone: string) {
  const value = String(phone || '').replace(/\D/g, '');
  return value.startsWith('0') ? '91' + value.slice(1) : value;
}

async function sendWhatsApp(to: string, body: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '';
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  if (!token || !phoneId || !to) return;
  await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } }),
  });
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const rawBody = await req.text();
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '';
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!secret || !(await verifySignature(rawBody, signature, secret))) return json({ error: 'Invalid signature' }, 401);

  const payload = JSON.parse(rawBody);
  const event = payload.event || '';
  if (!['payment_link.paid', 'payment.captured'].includes(event)) return json({ received: true });

  const link = payload.payload?.payment_link?.entity || {};
  const payment = payload.payload?.payment?.entity || {};
  const bookingId = link.reference_id || link.notes?.booking_id || payment.notes?.booking_id || '';
  const paymentId = payment.id || link.payment_id || '';
  if (!bookingId || !paymentId) return json({ error: 'Booking or payment id missing' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: booking, error: bookingError } = await supabase.from('bookings')
    .select('id, booking_code, customer_id, provider_id, amount, payment_status').eq('id', bookingId).single();
  if (bookingError || !booking) return json({ error: 'Booking not found' }, 404);
  if (booking.payment_status === 'paid') return json({ received: true, duplicate: true });

  const amountPaise = payment.amount || link.amount_paid || link.amount || 0;
  if (amountPaise && Math.round(Number(booking.amount) * 100) !== Number(amountPaise)) return json({ error: 'Payment amount mismatch' }, 400);

  const { data: savedPayment, error: paymentError } = await supabase.from('payments').upsert({
    booking_id: booking.id, razorpay_payment_id: paymentId, razorpay_order_id: payment.order_id || link.order_id || '',
    razorpay_signature: signature, amount: Number(amountPaise) / 100, currency: payment.currency || 'INR',
    status: 'captured', payment_method: payment.method || 'razorpay', payment_metadata: payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'booking_id' }).select('id').single();
  if (paymentError) return json({ error: paymentError.message }, 500);

  const { error: updateError } = await supabase.from('bookings').update({
    payment_id: savedPayment.id, payment_status: 'paid', status: 'pending', updated_at: new Date().toISOString(),
  }).eq('id', booking.id);
  if (updateError) return json({ error: updateError.message }, 500);

  const { data: customer } = await supabase.from('profiles').select('phone').eq('id', booking.customer_id).maybeSingle();
  const customerPhone = digits(customer?.phone || '');
  await sendWhatsApp(customerPhone, `Payment received for booking ${booking.booking_code}. Your payment is done and we are waiting for provider confirmation.`);
  return json({ received: true });
});
