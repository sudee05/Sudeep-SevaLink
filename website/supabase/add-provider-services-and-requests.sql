-- Add provider service enrollment and missing-service requests.
-- Run this in Supabase SQL Editor for an existing database.

create table if not exists public.provider_services (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz default now(),
  unique (provider_id, service_id)
);

alter table public.provider_services enable row level security;

drop policy if exists "Provider services are viewable by owners and admins" on public.provider_services;
drop policy if exists "Providers can insert own services" on public.provider_services;
drop policy if exists "Providers can delete own services" on public.provider_services;

create policy "Provider services are viewable by owners and admins"
  on public.provider_services for select using (
    exists (select 1 from public.providers where id = provider_id and user_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

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

create table if not exists public.service_requests (
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

alter table public.service_requests
  add column if not exists provider_id uuid references public.providers(id) on delete set null,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists phone text default '',
  add column if not exists service_name text,
  add column if not exists description text default '',
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_requests'
      and column_name = 'name'
  ) then
    update public.service_requests
      set service_name = coalesce(service_name, name);
  end if;

  update public.service_requests
    set service_name = coalesce(service_name, '');
end $$;

alter table public.service_requests
  alter column service_name set not null;

alter table public.service_requests enable row level security;

drop policy if exists "Users and admins can view service requests" on public.service_requests;
drop policy if exists "Users can create service requests" on public.service_requests;
drop policy if exists "Admins can update service requests" on public.service_requests;

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

drop trigger if exists service_requests_updated_at on public.service_requests;

create trigger service_requests_updated_at before update on public.service_requests
  for each row execute function public.update_updated_at();
