-- ============================================================
-- FinMate – Supabase Database Schema
-- ============================================================
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com)
-- Make sure you have enabled Google OAuth in:
--   Authentication → Providers → Google
-- ============================================================

-- 1. TABLES
-- ============================================================

create table if not exists public.transactions (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  type         text not null check (type in ('income', 'expense', 'transfer')),
  category     text not null,
  amount       decimal not null,
  description  text default '',
  date         date not null default current_date,
  account_id   text,
  to_account_id text,
  tags         text[],
  created_at   timestamptz default now()
);

create table if not exists public.accounts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  type         text not null check (type in ('cash','bank','e-wallet','credit-card','investment','savings')),
  balance      decimal default 0,
  currency     text default 'IDR',
  icon         text default 'cash',
  color        text default '#10b981',
  created_at   timestamptz default now()
);

create table if not exists public.budgets (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  category     text not null,
  amount       decimal not null,
  spent        decimal default 0,
  period       text default 'monthly' check (period in ('daily','weekly','monthly','yearly')),
  start_date   date,
  end_date     date,
  created_at   timestamptz default now()
);

create table if not exists public.goals (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  target_amount   decimal not null,
  current_amount  decimal default 0,
  deadline        date,
  icon            text default 'target',
  color           text default '#10b981',
  created_at      timestamptz default now()
);

create table if not exists public.debts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  type         text not null check (type in ('debt', 'receivable')),
  person_name  text not null,
  amount       decimal not null,
  description  text default '',
  date         date not null default current_date,
  due_date     date,
  account_id   text,
  is_paid      boolean default false,
  paid_date    date,
  created_at   timestamptz default now()
);

create table if not exists public.installments (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  total_amount     decimal not null,
  down_payment     decimal default 0,
  monthly_payment  decimal not null,
  duration_months  int not null,
  paid_months      int default 0,
  start_date       date not null default current_date,
  account_id       text,
  category         text default 'Cicilan',
  is_completed     boolean default false,
  created_at       timestamptz default now()
);


-- 2. ROW LEVEL SECURITY
-- ============================================================

alter table public.transactions  enable row level security;
alter table public.accounts      enable row level security;
alter table public.budgets       enable row level security;
alter table public.goals         enable row level security;
alter table public.debts         enable row level security;
alter table public.installments  enable row level security;

-- Transactions
create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- Accounts
create policy "Users can view own accounts"
  on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts"
  on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts"
  on public.accounts for delete using (auth.uid() = user_id);

-- Budgets
create policy "Users can view own budgets"
  on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets"
  on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets"
  on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets"
  on public.budgets for delete using (auth.uid() = user_id);

-- Goals
create policy "Users can view own goals"
  on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals"
  on public.goals for delete using (auth.uid() = user_id);

-- Debts
create policy "Users can view own debts"
  on public.debts for select using (auth.uid() = user_id);
create policy "Users can insert own debts"
  on public.debts for insert with check (auth.uid() = user_id);
create policy "Users can update own debts"
  on public.debts for update using (auth.uid() = user_id);
create policy "Users can delete own debts"
  on public.debts for delete using (auth.uid() = user_id);

-- Installments
create policy "Users can view own installments"
  on public.installments for select using (auth.uid() = user_id);
create policy "Users can insert own installments"
  on public.installments for insert with check (auth.uid() = user_id);
create policy "Users can update own installments"
  on public.installments for update using (auth.uid() = user_id);
create policy "Users can delete own installments"
  on public.installments for delete using (auth.uid() = user_id);


-- 3. INDEXES (optional, recommended)
-- ============================================================

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);
create index if not exists idx_accounts_user
  on public.accounts (user_id);
create index if not exists idx_budgets_user
  on public.budgets (user_id);
create index if not exists idx_goals_user
  on public.goals (user_id);
create index if not exists idx_debts_user
  on public.debts (user_id);
create index if not exists idx_installments_user
  on public.installments (user_id);
