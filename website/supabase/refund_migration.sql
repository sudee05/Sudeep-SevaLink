-- Refund support for provider-side booking cancellation.
-- Deploy website/supabase/functions/refund-payment with RAZORPAY_KEY_ID and
-- RAZORPAY_KEY_SECRET set as Supabase Edge Function secrets.

alter table public.payments
  add column if not exists razorpay_refund_id text default '',
  add column if not exists refunded_at timestamptz;

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status in ('created', 'authorized', 'captured', 'failed', 'refunded'));

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'pending',
      'accepted',
      'confirmed',
      'reschedule_requested',
      'reschedule_accepted',
      'reschedule_rejected',
      'in_progress',
      'completed',
      'cancelled',
      'rejected'
    )
  );

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('pending', 'deposit_paid', 'paid', 'refunded', 'failed'));
