-- Every vet, editor and admin gets a row here, one-to-one with auth.users.
-- This is the foundation for role checks used by every other table's RLS policies.

create type public.user_role as enum ('vet', 'editor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'vet',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper functions used by RLS policies on this and future tables.
-- security definer + a fixed search_path so they can read profiles even
-- though the calling user's own RLS policy would otherwise block that read.

create or replace function public.is_editor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- A vet can see and update only their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Editors and admins can see every profile (needed for the admin user list).
create policy "profiles_select_editor"
  on public.profiles for select
  using (public.is_editor());

-- Only an admin can change someone else's role.
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin());

-- When someone signs up in Supabase Auth, automatically create their profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create index profiles_role_idx on public.profiles (role);
