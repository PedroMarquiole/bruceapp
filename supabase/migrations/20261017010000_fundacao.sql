-- Fundação: utilitários, conta única e perfil.

-- Atualiza updated_at em qualquer tabela que tenha a coluna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Esquema privado: não exposto pela API.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- E-mails autorizados a criar conta. Preenchido direto no banco, nunca versionado.
create table app_private.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function app_private.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (select 1 from app_private.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'Cadastro não autorizado para este e-mail' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function app_private.enforce_allowed_email();

-- Perfil: uma linha por usuário.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  timezone text not null default 'America/Sao_Paulo',
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  track_calories boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "perfil: dono lê" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: dono atualiza" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- Inserção e exclusão só pelo sistema (gatilho abaixo e cascata da conta).

create or replace function app_private.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger create_profile
  after insert on auth.users
  for each row execute function app_private.create_profile();
