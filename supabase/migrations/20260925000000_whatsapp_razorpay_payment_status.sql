-- WhatsApp bookings start in payment_pending and move to pending after Razorpay confirmation.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_payment_link_id text;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('payment_pending', 'pending', 'accepted', 'confirmed', 'rejected', 'reschedule_requested', 'reschedule_accepted', 'reschedule_rejected', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON public.bookings (payment_status);
