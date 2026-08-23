import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    return jsonResponse({ error: 'Refund service is not configured.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'You must be logged in to cancel a booking.' }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  if (!bookingId) {
    return jsonResponse({ error: 'booking_id is required.' }, 400);
  }

  const { data: booking, error: bookingError } = await adminClient
    .from('bookings')
    .select('id, customer_id, provider_id, service_title, provider_name, status, payment_status, payment_id')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return jsonResponse({ error: 'Booking not found.' }, 404);
  }

  const { data: provider } = await adminClient
    .from('providers')
    .select('user_id')
    .eq('id', booking.provider_id)
    .single();

  if (!provider || provider.user_id !== user.id) {
    return jsonResponse({ error: 'Only the assigned provider can cancel this booking.' }, 403);
  }

  if (!['pending', 'accepted', 'confirmed', 'in_progress', 'reschedule_requested'].includes(booking.status)) {
    return jsonResponse({ error: 'This booking cannot be cancelled now.' }, 409);
  }

  const { data: payment } = await adminClient
    .from('payments')
    .select('id, razorpay_payment_id, amount, currency, status')
    .eq('booking_id', bookingId)
    .maybeSingle();

  let refundId = '';
  if (payment?.razorpay_payment_id && payment.status !== 'refunded') {
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const refundResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speed: 'normal',
          notes: {
            booking_id: bookingId,
            reason: 'Provider cancelled booking',
          },
        }),
      },
    );

    const refund = await refundResponse.json().catch(() => ({}));
    if (!refundResponse.ok) {
      return jsonResponse({ error: refund?.error?.description ?? 'Razorpay refund failed.' }, 502);
    }

    refundId = typeof refund.id === 'string' ? refund.id : '';
    await adminClient
      .from('payments')
      .update({
        status: 'refunded',
        razorpay_refund_id: refundId,
        refunded_at: new Date().toISOString(),
        payment_metadata: {
          refund,
          refund_reason: 'Provider cancelled booking',
        },
      })
      .eq('id', payment.id);
  }

  await adminClient
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: payment ? 'refunded' : booking.payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  await adminClient.from('notifications').insert({
    receiver_id: booking.customer_id,
    user_id: booking.customer_id,
    sender_id: user.id,
    booking_id: bookingId,
    type: payment ? 'refund_initiated' : 'booking_cancelled',
    title: payment ? 'Refund initiated' : 'Booking cancelled',
    message: payment
      ? 'Your booking was cancelled by the provider. The amount will be refunded in 2-3 working days.'
      : 'Your booking was cancelled by the provider.',
    is_read: false,
    read: false,
  });

  return jsonResponse({ ok: true, refund_id: refundId || null });
});
