-- Make public.services contain only: id, name, description.
-- Run this in Supabase SQL Editor for an existing database.

drop policy if exists "Active services are viewable by everyone" on public.services;
drop policy if exists "Services are viewable by everyone" on public.services;
drop policy if exists "Providers can insert own services" on public.services;
drop policy if exists "Providers can update own services" on public.services;
drop policy if exists "Admins can insert services" on public.services;
drop policy if exists "Admins can update services" on public.services;
drop policy if exists "Admins can delete services" on public.services;

drop trigger if exists services_updated_at on public.services;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'name'
  ) then
    alter table public.services add column name text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'title'
  ) then
    update public.services set name = coalesce(name, title);
  end if;
end $$;

alter table public.services
  alter column name set not null,
  alter column description set default '',
  drop column if exists title,
  drop column if exists category_id,
  drop column if exists provider_id,
  drop column if exists location,
  drop column if exists price,
  drop column if exists rating,
  drop column if exists reviews_count,
  drop column if exists verified,
  drop column if exists image_url,
  drop column if exists active,
  drop column if exists created_at,
  drop column if exists updated_at;

create policy "Services are viewable by everyone"
  on public.services for select using (true);

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
