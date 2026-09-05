import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS preflight — must return 200 OK
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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
  console.log('[refund] booking_id received:', bookingId);
  if (!bookingId) {
    return jsonResponse({ error: 'booking_id is required.' }, 400);
  }

  // Fetch booking — only columns that actually exist in the schema
  const { data: booking, error: bookingError } = await adminClient
    .from('bookings')
    .select('id, customer_id, provider_id, booking_code, status')
    .eq('id', bookingId)
    .single();

  console.log('[refund] booking query result:', JSON.stringify(booking));
  console.log('[refund] booking query error:', JSON.stringify(bookingError));

  if (bookingError || !booking) {
    return jsonResponse({
      error: 'Booking not found.',
      detail: bookingError?.message ?? 'no row',
      code: bookingError?.code,
    }, 404);
  }

  console.log('[refund] booking status:', booking.status, '| provider_id:', booking.provider_id);

  // Verify the caller is the assigned provider
  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('user_id')
    .eq('id', booking.provider_id)
    .single();

  console.log('[refund] provider lookup:', JSON.stringify(provider), 'error:', JSON.stringify(providerError));
  console.log('[refund] caller user.id:', user.id, '| provider.user_id:', provider?.user_id);

  if (!provider || provider.user_id !== user.id) {
    return jsonResponse({ error: 'Only the assigned provider can cancel this booking.' }, 403);
  }

  // Allow cancellation from any non-terminal status
  const cancellableStatuses = ['pending', 'accepted', 'confirmed', 'in_progress', 'reschedule_requested'];
  console.log('[refund] status check:', booking.status, 'cancellable?', cancellableStatuses.includes(booking.status));
  if (!cancellableStatuses.includes(booking.status)) {
    return jsonResponse({ error: `Booking cannot be cancelled (current status: ${booking.status}).` }, 409);
  }


  // Try to find a payment record for this booking
  const { data: payment } = await adminClient
    .from('payments')
    .select('id, razorpay_payment_id, amount, currency, status')
    .eq('booking_id', bookingId)
    .maybeSingle();

  let refundId = '';
  let refundError: string | null = null;

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
      // Log but don't block — booking will still be cancelled
      refundError = refund?.error?.description ?? 'Razorpay refund failed.';
      console.log('[refund] Razorpay refund failed (non-fatal):', refundError);
    } else {
      refundId = typeof refund.id === 'string' ? refund.id : '';
    }

    await adminClient
      .from('payments')
      .update({
        status: refundId ? 'refunded' : 'refund_failed',
        razorpay_refund_id: refundId || null,
        refunded_at: refundId ? new Date().toISOString() : null,
        payment_metadata: {
          refund: refundId ? refund : null,
          refund_error: refundError,
          refund_reason: 'Provider cancelled booking',
        },
      })
      .eq('id', payment.id);
  }

  // Update booking status to cancelled
  await adminClient
    .from('bookings')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // Notify the customer
  await adminClient.from('notifications').insert({
    receiver_id: booking.customer_id,
    user_id: booking.customer_id,
    sender_id: user.id,
    booking_id: bookingId,
    type: payment ? 'refund_initiated' : 'booking_cancelled',
    title: payment ? 'Refund initiated' : 'Booking cancelled',
    message: payment
      ? `Your booking ${booking.booking_code ?? bookingId} was cancelled by the provider. The amount will be refunded in 2–3 working days.`
      : `Your booking ${booking.booking_code ?? bookingId} was cancelled by the provider.`,
    is_read: false,
    read: false,
  });

  return jsonResponse({ ok: true, refund_id: refundId || null, refund_error: refundError || null });
});
