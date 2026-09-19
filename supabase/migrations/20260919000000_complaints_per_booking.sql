-- A customer may submit one complaint for each individual booking, even when
-- multiple bookings use the same service.

drop index if exists public.booking_complaints_customer_service_uidx;

create unique index if not exists booking_complaints_customer_booking_uidx
  on public.booking_complaints (customer_id, booking_id);

notify pgrst, 'reload schema';
