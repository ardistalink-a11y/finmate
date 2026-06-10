import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = localStorage.getItem('supabase_url') || '';
  const key = localStorage.getItem('supabase_anon_key') || '';

  if (!url || !key) return null;

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export function resetSupabase() {
  supabaseInstance = null;
}

export function initSupabase(url: string, key: string): SupabaseClient {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// SQL to create tables in Supabase:
/*
-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null,
  amount decimal not null,
  description text,
  date date not null default current_date,
  account_id text,
  to_account_id text,
  tags text[],
  created_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  balance decimal default 0,
  currency text default 'IDR',
  icon text,
  color text,
  created_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  amount decimal not null,
  spent decimal default 0,
  period text default 'monthly',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  target_amount decimal not null,
  current_amount decimal default 0,
  deadline date,
  icon text,
  color text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table public.transactions enable row level security;
alter table public.accounts enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

create policy "Users can view own accounts" on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts" on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts" on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts" on public.accounts for delete using (auth.uid() = user_id);

create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);
*/
