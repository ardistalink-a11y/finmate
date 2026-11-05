-- Harden tenant access, remove public RPC execution, and index uncovered foreign keys.

begin;

drop policy if exists categories_own on public.categories;
create policy categories_select_shared_or_owned
  on public.categories for select to anon, authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy categories_insert_owned
  on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy categories_update_owned
  on public.categories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy categories_delete_owned
  on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists accounts_own on public.accounts;
create policy accounts_own on public.accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists budgets_own on public.budgets;
create policy budgets_own on public.budgets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists debts_own on public.debts;
create policy debts_own on public.debts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists goals_own on public.goals;
create policy goals_own on public.goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists recurring_own on public.recurring_transactions;
create policy recurring_own on public.recurring_transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists transactions_own on public.transactions;
create policy transactions_own on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all privileges on all tables in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.categories to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.handle_profile_categories() from public, anon, authenticated, service_role;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

alter function public.handle_new_user() set search_path = '';
alter function public.handle_profile_categories() set search_path = '';
alter function public.rls_auto_enable() set search_path = 'pg_catalog';
alter function public.seed_default_categories(uuid) set search_path = '';
alter function public.set_updated_at() set search_path = '';

create index if not exists budgets_category_id_idx on public.budgets(category_id);
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists recurring_transactions_account_id_idx on public.recurring_transactions(account_id);
create index if not exists recurring_transactions_category_id_idx on public.recurring_transactions(category_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_related_transaction_id_idx on public.transactions(related_transaction_id);
create index if not exists transactions_to_account_id_idx on public.transactions(to_account_id);

commit;
