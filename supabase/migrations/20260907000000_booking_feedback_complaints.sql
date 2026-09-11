-- Booking feedback and complaints used by the customer and admin portals.

create table if not exists public.booking_feedback (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id),
  provider_id uuid references public.providers(id),
  customer_id uuid not null references public.profiles(id),
  service_id uuid references public.services(id),
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.booking_complaints (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id),
  provider_id uuid references public.providers(id),
  customer_id uuid not null references public.profiles(id),
  service_id uuid references public.services(id),
  subject text not null,
  comment text default '',
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_feedback enable row level security;
alter table public.booking_complaints enable row level security;

alter table public.booking_feedback add column if not exists service_id uuid references public.services(id);

create unique index if not exists booking_feedback_customer_service_uidx
  on public.booking_feedback (customer_id, service_id)
  where service_id is not null;

create unique index if not exists booking_complaints_customer_service_uidx
  on public.booking_complaints (customer_id, service_id)
  where service_id is not null;

drop policy if exists "Customers can create booking feedback" on public.booking_feedback;
create policy "Customers can create booking feedback"
  on public.booking_feedback for insert to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "Customers and providers can view booking feedback" on public.booking_feedback;
create policy "Customers and providers can view booking feedback"
  on public.booking_feedback for select to authenticated
  using (
    customer_id = auth.uid()
    or provider_id in (select id from public.providers where user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Customers can create booking complaints" on public.booking_complaints;
create policy "Customers can create booking complaints"
  on public.booking_complaints for insert to authenticated
  with check (customer_id = auth.uid());

drop policy if exists "Admins can view booking complaints" on public.booking_complaints;
create policy "Admins can view booking complaints"
  on public.booking_complaints for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Customers can view their booking complaints" on public.booking_complaints;
create policy "Customers can view their booking complaints"
  on public.booking_complaints for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Admins can update booking complaints" on public.booking_complaints;
create policy "Admins can update booking complaints"
  on public.booking_complaints for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

notify pgrst, 'reload schema';
