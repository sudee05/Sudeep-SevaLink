-- Payment migration for SevaLink
-- Run this after the base schema.

alter table public.bookings
  add column if not exists payment_id uuid;

create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  razorpay_payment_id text not null unique,
  razorpay_order_id text default '',
  razorpay_signature text default '',
  amount numeric(10,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'captured' check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  payment_method text not null default 'razorpay',
  payment_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payments_booking_id_idx on public.payments(booking_id);

alter table public.payments enable row level security;

create policy if not exists "Customers, providers, and admins can view payments"
  on public.payments for select using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and (
          auth.uid() = b.customer_id
          or exists (select 1 from public.providers where id = b.provider_id and user_id = auth.uid())
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

create policy if not exists "Customers can create payments for own bookings"
  on public.payments for insert with check (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.customer_id = auth.uid()
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy if not exists "Admins can update payments"
  on public.payments for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_payment_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Optional backfill for legacy rows can be added here if needed.
