import { Transaction, Account, Budget, Goal, ChatMessage, Debt, Installment } from '@/types';
import { getSupabase } from './supabase';

// ── Helpers ──

function getLocal<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Transactions ──

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (!error && data) return data;
  return [];
}

export async function addTransaction(tx: Transaction, userId: string): Promise<Transaction> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .insert({ ...tx, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return tx;
}

export async function updateTransaction(tx: Transaction, userId: string): Promise<Transaction> {
  const { data, error } = await getSupabase()
    .from('transactions')
    .update(tx)
    .eq('id', tx.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return tx;
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  await getSupabase().from('transactions').delete().eq('id', id).eq('user_id', userId);
}

// ── Accounts ──

export async function getAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await getSupabase()
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!error && data) return data;
  return [];
}

export async function addAccount(account: Account, userId: string): Promise<Account> {
  const { data, error } = await getSupabase()
    .from('accounts')
    .insert({ ...account, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return account;
}

export async function updateAccount(account: Account, userId: string): Promise<Account> {
  const { data, error } = await getSupabase()
    .from('accounts')
    .update(account)
    .eq('id', account.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return account;
}

export async function deleteAccount(id: string, userId: string): Promise<void> {
  await getSupabase().from('accounts').delete().eq('id', id).eq('user_id', userId);
}

// ── Budgets ──

export async function getBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await getSupabase()
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!error && data) return data;
  return [];
}

export async function addBudget(budget: Budget, userId: string): Promise<Budget> {
  const { data, error } = await getSupabase()
    .from('budgets')
    .insert({ ...budget, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return budget;
}

export async function updateBudget(budget: Budget, userId: string): Promise<Budget> {
  const { data, error } = await getSupabase()
    .from('budgets')
    .update(budget)
    .eq('id', budget.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return budget;
}

export async function deleteBudget(id: string, userId: string): Promise<void> {
  await getSupabase().from('budgets').delete().eq('id', id).eq('user_id', userId);
}

// ── Goals ──

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await getSupabase()
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (!error && data) return data;
  return [];
}

export async function addGoal(goal: Goal, userId: string): Promise<Goal> {
  const { data, error } = await getSupabase()
    .from('goals')
    .insert({ ...goal, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return goal;
}

export async function updateGoal(goal: Goal, userId: string): Promise<Goal> {
  const { data, error } = await getSupabase()
    .from('goals')
    .update(goal)
    .eq('id', goal.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return goal;
}

export async function deleteGoal(id: string, userId: string): Promise<void> {
  await getSupabase().from('goals').delete().eq('id', id).eq('user_id', userId);
}

// ── Debts ──

export async function getDebts(userId: string): Promise<Debt[]> {
  const { data, error } = await getSupabase()
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (!error && data) return data;
  return [];
}

export async function addDebt(debt: Debt, userId: string): Promise<Debt> {
  const { data, error } = await getSupabase()
    .from('debts')
    .insert({ ...debt, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return debt;
}

export async function updateDebt(debt: Debt, userId: string): Promise<Debt> {
  const { data, error } = await getSupabase()
    .from('debts')
    .update(debt)
    .eq('id', debt.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return debt;
}

export async function deleteDebt(id: string, userId: string): Promise<void> {
  await getSupabase().from('debts').delete().eq('id', id).eq('user_id', userId);
}

// ── Installments ──

export async function getInstallments(userId: string): Promise<Installment[]> {
  const { data, error } = await getSupabase()
    .from('installments')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (!error && data) return data;
  return [];
}

export async function addInstallment(inst: Installment, userId: string): Promise<Installment> {
  const { data, error } = await getSupabase()
    .from('installments')
    .insert({ ...inst, user_id: userId })
    .select()
    .single();
  if (!error && data) return data;
  return inst;
}

export async function updateInstallment(inst: Installment, userId: string): Promise<Installment> {
  const { data, error } = await getSupabase()
    .from('installments')
    .update(inst)
    .eq('id', inst.id)
    .eq('user_id', userId)
    .select()
    .single();
  if (!error && data) return data;
  return inst;
}

export async function deleteInstallment(id: string, userId: string): Promise<void> {
  await getSupabase().from('installments').delete().eq('id', id).eq('user_id', userId);
}

// ── Chat Messages (tetap localStorage, per-device) ──

export function getChatMessages(): ChatMessage[] {
  return getLocal<ChatMessage>('finmate_chat_messages');
}

export function saveChatMessages(messages: ChatMessage[]) {
  setLocal('finmate_chat_messages', messages);
}

export function clearChatMessages() {
  localStorage.removeItem('finmate_chat_messages');
}
