-- Reconstructed core schema for fresh Finmate installations.
-- This matches the schema represented by migration version 20261104065059.
-- Tenant policies and API grants are applied by the following security migration.

begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  base_currency character(3) not null default 'IDR',
  locale text not null default 'id' check (locale in ('id', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'ewallet', 'cash', 'credit_card', 'investment', 'loan')),
  currency character(3) not null default 'IDR',
  opening_balance numeric(18,2) not null default 0,
  credit_limit numeric(18,2),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(18,2) not null check (amount >= 0),
  currency character(3) not null default 'IDR',
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(18,2) not null check (principal >= 0),
  outstanding numeric(18,2) not null check (outstanding >= 0),
  interest_rate numeric(8,4) not null default 0,
  currency character(3) not null default 'IDR',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  base character(3) not null,
  quote character(3) not null,
  rate numeric(20,8) not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  constraint fx_rates_base_quote_fetched_at_key unique (base, quote, fetched_at)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(18,2) not null check (target_amount > 0),
  current_amount numeric(18,2) not null default 0 check (current_amount >= 0),
  currency character(3) not null default 'IDR',
  target_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(18,2) not null check (amount > 0),
  note text,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  next_run date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(18,2) not null,
  currency character(3) not null,
  fx_rate numeric(20,8) not null default 1,
  amount_base numeric(18,2) not null,
  date date not null default current_date,
  note text,
  merchant text,
  source text not null default 'manual',
  to_account_id uuid references public.accounts(id) on delete restrict,
  related_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);
create index budgets_user_idx on public.budgets(user_id);
create index debts_user_idx on public.debts(user_id);
create index goals_user_idx on public.goals(user_id);
create index recurring_user_idx on public.recurring_transactions(user_id);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_user_date_idx on public.transactions(user_id, date desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.budgets enable row level security;
alter table public.debts enable row level security;
alter table public.fx_rates enable row level security;
alter table public.goals enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.transactions enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $function$
  insert into public.categories (user_id, name, type)
  select p_user_id, x.name, x.type
  from (values
    ('Salary','income'),('Other income','income'),('Food','expense'),('Transport','expense'),
    ('Bills','expense'),('Shopping','expense'),('Health','expense'),('Entertainment','expense'),
    ('Education','expense'),('Other expense','expense')
  ) as x(name,type)
  where not exists (select 1 from public.categories c where c.user_id = p_user_id);
$function$;

create or replace function public.handle_profile_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$function$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
declare
  cmd record;
  tbl name;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      begin
        select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
        execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$function$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger debts_updated_at before update on public.debts
  for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger recurring_updated_at before update on public.recurring_transactions
  for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger seed_categories_after_profile after insert on public.profiles
  for each row execute function public.handle_profile_categories();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

commit;
