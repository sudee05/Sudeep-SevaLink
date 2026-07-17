-- Notifications + realtime chat upgrade for SevaLink.
-- Run this after schema.sql in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

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
