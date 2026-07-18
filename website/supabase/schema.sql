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
    or status = 'approved'
    or exists (select 1 from public.profiles where id = user_id and approval_status = 'approved')
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
  price numeric(10,2) not null default 0 check (price >= 0),
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

create policy "Providers can update own services"
  on public.provider_services for update using (
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
-- 13. NOTIFICATIONS + REALTIME CHAT UPGRADE
-- =============================================
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending',
      'accepted',
      'confirmed',
      'rejected',
      'reschedule_requested',
      'reschedule_accepted',
      'reschedule_rejected',
      'in_progress',
      'completed',
      'cancelled'
    )
  );

alter table public.notifications add column if not exists sender_id uuid references public.profiles(id) on delete set null;
alter table public.notifications add column if not exists receiver_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists booking_id uuid references public.bookings(id) on delete cascade;
alter table public.notifications add column if not exists type text not null default 'system';
alter table public.notifications add column if not exists is_read boolean not null default false;

update public.notifications set receiver_id = user_id where receiver_id is null and user_id is not null;
update public.notifications set is_read = read where read is not null;
delete from public.notifications where receiver_id is null;

alter table public.notifications alter column receiver_id set not null;

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text default '',
  attachment_url text,
  attachment_path text,
  attachment_type text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_receiver_created_idx on public.notifications(receiver_id, created_at desc);
create index if not exists conversations_customer_idx on public.conversations(customer_id);
create index if not exists conversations_provider_idx on public.conversations(provider_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users see own notifications" on public.notifications;
drop policy if exists "Admins can create notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can view received notifications" on public.notifications;
drop policy if exists "Users and admins can create notifications" on public.notifications;
drop policy if exists "Users can update received notifications" on public.notifications;

create policy "Users can view received notifications"
  on public.notifications for select using (auth.uid() = receiver_id);

create policy "Users and admins can create notifications"
  on public.notifications for insert with check (
    auth.uid() = receiver_id
    or auth.uid() = sender_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update received notifications"
  on public.notifications for update using (auth.uid() = receiver_id);

drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;

create policy "Participants can view conversations"
  on public.conversations for select using (
    auth.uid() = customer_id
    or auth.uid() = provider_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Participants can create conversations"
  on public.conversations for insert with check (
    auth.uid() = customer_id
    or auth.uid() = provider_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Participants can update conversations"
  on public.conversations for update using (
    auth.uid() = customer_id
    or auth.uid() = provider_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Participants can view messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Participants can update read receipts" on public.messages;

create policy "Participants can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Participants can send messages"
  on public.messages for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.status = 'active'
        and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create policy "Participants can update read receipts"
  on public.messages for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create or replace function public.provider_user_id(provider_record_id uuid)
returns uuid
language sql
stable
as $$
  select user_id from public.providers where id = provider_record_id
$$;

create or replace function public.create_notification(
  p_receiver_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_booking_id uuid default null,
  p_sender_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
begin
  if p_receiver_id is null then
    return null;
  end if;

  insert into public.notifications (receiver_id, user_id, sender_id, booking_id, type, title, message, is_read, read)
  values (p_receiver_id, p_receiver_id, p_sender_id, p_booking_id, p_type, p_title, p_message, false, false)
  returning id into created_id;

  return created_id;
end;
$$;

create or replace function public.ensure_booking_conversation(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  provider_user uuid;
  conversation_id uuid;
begin
  select * into booking_row from public.bookings where id = p_booking_id;
  if not found then
    return null;
  end if;

  provider_user := public.provider_user_id(booking_row.provider_id);
  if booking_row.customer_id is null or provider_user is null then
    return null;
  end if;

  insert into public.conversations (booking_id, customer_id, provider_id)
  values (booking_row.id, booking_row.customer_id, provider_user)
  on conflict (booking_id) do update set status = 'active', updated_at = now()
  returning id into conversation_id;

  return conversation_id;
end;
$$;

create or replace function public.handle_booking_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_user uuid;
  booking_label text;
begin
  provider_user := public.provider_user_id(new.provider_id);
  booking_label := coalesce(new.service_title, 'your booking');

  if tg_op = 'INSERT' then
    perform public.create_notification(
      provider_user,
      'booking_created',
      'New booking request',
      coalesce(new.customer_name, 'A customer') || ' requested ' || booking_label || '.',
      new.id,
      new.customer_id
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status in ('accepted', 'confirmed') then
      perform public.ensure_booking_conversation(new.id);
      perform public.create_notification(new.customer_id, 'booking_accepted', 'Booking accepted', coalesce(new.provider_name, 'Provider') || ' accepted your booking.', new.id, provider_user);
    elsif new.status = 'rejected' then
      perform public.create_notification(new.customer_id, 'booking_rejected', 'Booking rejected', coalesce(new.provider_name, 'Provider') || ' rejected your booking.', new.id, provider_user);
    elsif new.status = 'reschedule_requested' then
      perform public.create_notification(new.customer_id, 'reschedule_requested', 'Reschedule requested', coalesce(new.provider_name, 'Provider') || ' requested a new schedule.', new.id, provider_user);
    elsif new.status = 'reschedule_accepted' then
      perform public.create_notification(provider_user, 'reschedule_accepted', 'Reschedule accepted', coalesce(new.customer_name, 'Customer') || ' accepted the reschedule.', new.id, new.customer_id);
    elsif new.status = 'reschedule_rejected' then
      perform public.create_notification(provider_user, 'reschedule_rejected', 'Reschedule rejected', coalesce(new.customer_name, 'Customer') || ' rejected the reschedule.', new.id, new.customer_id);
    elsif new.status = 'completed' then
      perform public.create_notification(new.customer_id, 'booking_completed', 'Booking completed', booking_label || ' was marked completed.', new.id, provider_user);
      perform public.create_notification(provider_user, 'booking_completed', 'Booking completed', booking_label || ' was marked completed.', new.id, new.customer_id);
    elsif new.status = 'cancelled' then
      perform public.create_notification(new.customer_id, 'booking_cancelled', 'Booking cancelled', booking_label || ' was cancelled.', new.id, provider_user);
      perform public.create_notification(provider_user, 'booking_cancelled', 'Booking cancelled', booking_label || ' was cancelled.', new.id, new.customer_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_notify_after_insert on public.bookings;
create trigger bookings_notify_after_insert
  after insert on public.bookings
  for each row execute function public.handle_booking_notifications();

drop trigger if exists bookings_notify_after_update on public.bookings;
create trigger bookings_notify_after_update
  after update of status on public.bookings
  for each row execute function public.handle_booking_notifications();

create or replace function public.handle_provider_approval_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status and new.role = 'provider' then
    if new.approval_status = 'approved' then
      perform public.create_notification(new.id, 'provider_approved', 'Provider approved', 'Your provider account has been approved.');
    elsif new.approval_status = 'denied' then
      perform public.create_notification(new.id, 'provider_rejected', 'Provider rejected', 'Your provider account was rejected.');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_provider_approval_notify on public.profiles;
create trigger profiles_provider_approval_notify
  after update of approval_status on public.profiles
  for each row execute function public.handle_provider_approval_notifications();

create or replace function public.handle_service_request_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'approved' then
      perform public.create_notification(new.user_id, 'service_request_approved', 'Service request approved', coalesce(new.service_name, 'Your requested service') || ' was approved.');
    elsif new.status = 'denied' then
      perform public.create_notification(new.user_id, 'service_request_rejected', 'Service request rejected', coalesce(new.service_name, 'Your requested service') || ' was rejected.');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_notify_after_update on public.service_requests;
create trigger service_requests_notify_after_update
  after update of status on public.service_requests
  for each row execute function public.handle_service_request_notifications();

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('provider-images', 'provider-images', true)
on conflict (id) do nothing;

drop policy if exists "Chat participants can upload attachments" on storage.objects;
drop policy if exists "Chat participants can read attachments" on storage.objects;
drop policy if exists "Providers can upload business images" on storage.objects;
drop policy if exists "Providers can update business images" on storage.objects;
drop policy if exists "Anyone can view provider business images" on storage.objects;

create policy "Chat participants can upload attachments"
  on storage.objects for insert with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id = (storage.foldername(name))[1]::uuid
        and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create policy "Chat participants can read attachments"
  on storage.objects for select using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id = (storage.foldername(name))[1]::uuid
        and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create policy "Providers can upload business images"
  on storage.objects for insert with check (
    bucket_id = 'provider-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Providers can update business images"
  on storage.objects for update using (
    bucket_id = 'provider-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view provider business images"
  on storage.objects for select using (bucket_id = 'provider-images');

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- =============================================
-- 13. AUTO-CREATE PROFILE TRIGGER
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
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
