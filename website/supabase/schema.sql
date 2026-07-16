-- =============================================
-- SevaLink Database Schema for Supabase
-- =============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. PROFILES (extends auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  phone text default '',
  avatar_url text default '',
  role text not null default 'customer' check (role in ('customer', 'provider', 'admin')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'denied')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- =============================================
-- 2. CATEGORIES
-- =============================================
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  icon text default '',
  color text default '',
  services_count int default 0,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

-- Everyone can read categories
create policy "Categories are viewable by everyone"
  on public.categories for select using (true);

-- Only admins can modify categories
create policy "Admins can insert categories"
  on public.categories for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update categories"
  on public.categories for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete categories"
  on public.categories for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 3. PROVIDERS
-- =============================================
create table public.providers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  business_name text not null,
  category text default '',
  about text default '',
  image_url text default '',
  rating numeric(2,1) default 0,
  total_jobs int default 0,
  experience text default '',
  verified boolean default false,
  certificates text[] default '{}',
  location text default '',
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.providers enable row level security;

-- Everyone can read approved providers
create policy "Approved providers are viewable by everyone"
  on public.providers for select using (
    verified = true
    or (auth.uid() is not null and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Providers can insert their own record
create policy "Users can create their provider profile"
  on public.providers for insert with check (auth.uid() = user_id);

-- Providers can update own record, admins can update any
create policy "Providers can update own record"
  on public.providers for update using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 4. SERVICES
-- =============================================
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default ''
);

alter table public.services enable row level security;

-- Everyone can read the master service catalog
create policy "Services are viewable by everyone"
  on public.services for select using (true);

-- Only admins can manage service catalog rows
create policy "Admins can insert services"
  on public.services for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update services"
  on public.services for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete services"
  on public.services for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 5. PROVIDER SERVICES
-- =============================================
create table public.provider_services (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz default now(),
  unique (provider_id, service_id)
);

alter table public.provider_services enable row level security;

create policy "Provider services are viewable by everyone"
  on public.provider_services for select using (true);

create policy "Providers can insert own services"
  on public.provider_services for insert with check (
    exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Providers can delete own services"
  on public.provider_services for delete using (
    exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 6. SERVICE REQUESTS
-- =============================================
create table public.service_requests (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references public.providers(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone text default '',
  service_name text not null,
  description text default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.service_requests enable row level security;

create policy "Users and admins can view service requests"
  on public.service_requests for select using (
    auth.uid() = user_id
    or exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can create service requests"
  on public.service_requests for insert with check (auth.uid() = user_id);

create policy "Admins can update service requests"
  on public.service_requests for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 7. BOOKINGS
-- =============================================
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  booking_code text unique not null default ('BK-' || floor(random() * 90000 + 10000)::text),
  service_id uuid references public.services(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  service_title text default '',
  provider_name text default '',
  customer_name text default '',
  scheduled_date timestamptz not null,
  booking_date date,
  booking_time time,
  status text default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  amount numeric(10,2) not null default 0,
  address text default '',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings enable row level security;

-- Customers see own bookings
create policy "Customers see own bookings"
  on public.bookings for select using (
    auth.uid() = customer_id
    or exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Customers can create bookings
create policy "Customers can create bookings"
  on public.bookings for insert with check (auth.uid() = customer_id);

-- Customers, providers, and admins can update bookings
create policy "Authorized users can update bookings"
  on public.bookings for update using (
    auth.uid() = customer_id
    or exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 8. REVIEWS
-- =============================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  service_id uuid references public.services(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

-- Everyone can read reviews
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);

-- Customers can create reviews
create policy "Customers can create reviews"
  on public.reviews for insert with check (auth.uid() = customer_id);

-- Customers can update own reviews
create policy "Customers can update own reviews"
  on public.reviews for update using (auth.uid() = customer_id);

-- =============================================
-- 9. FEEDBACK
-- =============================================
create table public.booking_feedback (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz default now(),
  unique (booking_id, customer_id)
);

alter table public.booking_feedback enable row level security;

create policy "Customers and providers can view booking feedback"
  on public.booking_feedback for select using (
    auth.uid() = customer_id
    or exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Customers can create booking feedback"
  on public.booking_feedback for insert with check (auth.uid() = customer_id);

-- =============================================
-- 10. COMPLAINTS
-- =============================================
create table public.booking_complaints (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  subject text not null,
  comment text default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz default now()
);

alter table public.booking_complaints enable row level security;

create policy "Customers and admins can view booking complaints"
  on public.booking_complaints for select using (
    auth.uid() = customer_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Customers can create booking complaints"
  on public.booking_complaints for insert with check (auth.uid() = customer_id);

create policy "Admins can update booking complaints"
  on public.booking_complaints for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- 11. DOCUMENTS (provider verification)
-- =============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references public.providers(id) on delete cascade,
  name text not null,
  file_url text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

-- Providers see own documents, admins see all
create policy "Authorized users can view documents"
  on public.documents for select using (
    exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Providers can upload own documents
create policy "Providers can insert own documents"
  on public.documents for insert with check (
    exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
  );

-- =============================================
-- 12. NOTIFICATIONS
-- =============================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text default '',
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

-- Users see own notifications
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);

-- System/admins can create notifications (using service role in backend)
create policy "Admins can create notifications"
  on public.notifications for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or auth.uid() = user_id
  );

-- Users can mark their own notifications as read
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- =============================================
-- 13. AUTO-CREATE PROFILE TRIGGER
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 12. UPDATED_AT TRIGGER
-- =============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger providers_updated_at before update on public.providers
  for each row execute function public.update_updated_at();

create trigger service_requests_updated_at before update on public.service_requests
  for each row execute function public.update_updated_at();

create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.update_updated_at();
