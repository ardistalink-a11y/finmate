import { Transaction, Account, Budget, Goal, ChatMessage, Debt, Installment } from '@/types';
import { getSupabase } from './supabase';

// Local Storage keys
const KEYS = {
  transactions: 'finmate_transactions',
  accounts: 'finmate_accounts',
  budgets: 'finmate_budgets',
  goals: 'finmate_goals',
  debts: 'finmate_debts',
  installments: 'finmate_installments',
  chatMessages: 'finmate_chat_messages',
};

function getLocal<T>(key: string, defaultValue: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Transactions ──

export async function getTransactions(userId?: string): Promise<Transaction[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!error && data) return data;
  }
  return getLocal<Transaction>(KEYS.transactions, []);
}

export async function addTransaction(tx: Transaction, userId?: string): Promise<Transaction> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const txs = getLocal<Transaction>(KEYS.transactions, []);
  txs.unshift(tx);
  setLocal(KEYS.transactions, txs);
  return tx;
}

export async function updateTransaction(tx: Transaction, userId?: string): Promise<Transaction> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('transactions')
      .update(tx)
      .eq('id', tx.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const txs = getLocal<Transaction>(KEYS.transactions, []);
  const idx = txs.findIndex(t => t.id === tx.id);
  if (idx !== -1) txs[idx] = tx;
  setLocal(KEYS.transactions, txs);
  return tx;
}

export async function deleteTransaction(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const txs = getLocal<Transaction>(KEYS.transactions, []).filter(t => t.id !== id);
  setLocal(KEYS.transactions, txs);
}

// ── Accounts ──

export async function getAccounts(userId?: string): Promise<Account[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) return data;
  }
  return getLocal<Account>(KEYS.accounts, []);
}

export async function addAccount(account: Account, userId?: string): Promise<Account> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const accounts = getLocal<Account>(KEYS.accounts, []);
  accounts.push(account);
  setLocal(KEYS.accounts, accounts);
  return account;
}

export async function updateAccount(account: Account, userId?: string): Promise<Account> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('accounts')
      .update(account)
      .eq('id', account.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const accounts = getLocal<Account>(KEYS.accounts, []);
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx !== -1) accounts[idx] = account;
  setLocal(KEYS.accounts, accounts);
  return account;
}

export async function deleteAccount(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('accounts').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const accounts = getLocal<Account>(KEYS.accounts, []).filter(a => a.id !== id);
  setLocal(KEYS.accounts, accounts);
}

// ── Budgets ──

export async function getBudgets(userId?: string): Promise<Budget[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) return data;
  }
  return getLocal<Budget>(KEYS.budgets, []);
}

export async function addBudget(budget: Budget, userId?: string): Promise<Budget> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...budget, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const budgets = getLocal<Budget>(KEYS.budgets, []);
  budgets.push(budget);
  setLocal(KEYS.budgets, budgets);
  return budget;
}

export async function updateBudget(budget: Budget, userId?: string): Promise<Budget> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('budgets')
      .update(budget)
      .eq('id', budget.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const budgets = getLocal<Budget>(KEYS.budgets, []);
  const idx = budgets.findIndex(b => b.id === budget.id);
  if (idx !== -1) budgets[idx] = budget;
  setLocal(KEYS.budgets, budgets);
  return budget;
}

export async function deleteBudget(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const budgets = getLocal<Budget>(KEYS.budgets, []).filter(b => b.id !== id);
  setLocal(KEYS.budgets, budgets);
}

// ── Goals ──

export async function getGoals(userId?: string): Promise<Goal[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) return data;
  }
  return getLocal<Goal>(KEYS.goals, []);
}

export async function addGoal(goal: Goal, userId?: string): Promise<Goal> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...goal, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const goals = getLocal<Goal>(KEYS.goals, []);
  goals.push(goal);
  setLocal(KEYS.goals, goals);
  return goal;
}

export async function updateGoal(goal: Goal, userId?: string): Promise<Goal> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('goals')
      .update(goal)
      .eq('id', goal.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const goals = getLocal<Goal>(KEYS.goals, []);
  const idx = goals.findIndex(g => g.id === goal.id);
  if (idx !== -1) goals[idx] = goal;
  setLocal(KEYS.goals, goals);
  return goal;
}

export async function deleteGoal(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const goals = getLocal<Goal>(KEYS.goals, []).filter(g => g.id !== id);
  setLocal(KEYS.goals, goals);
}

// ── Debts ──

export async function getDebts(userId?: string): Promise<Debt[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!error && data) return data;
  }
  return getLocal<Debt>(KEYS.debts, []);
}

export async function addDebt(debt: Debt, userId?: string): Promise<Debt> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('debts')
      .insert({ ...debt, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const debts = getLocal<Debt>(KEYS.debts, []);
  debts.unshift(debt);
  setLocal(KEYS.debts, debts);
  return debt;
}

export async function updateDebt(debt: Debt, userId?: string): Promise<Debt> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('debts')
      .update(debt)
      .eq('id', debt.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const debts = getLocal<Debt>(KEYS.debts, []);
  const idx = debts.findIndex(d => d.id === debt.id);
  if (idx !== -1) debts[idx] = debt;
  setLocal(KEYS.debts, debts);
  return debt;
}

export async function deleteDebt(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const debts = getLocal<Debt>(KEYS.debts, []).filter(d => d.id !== id);
  setLocal(KEYS.debts, debts);
}

// ── Installments ──

export async function getInstallments(userId?: string): Promise<Installment[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });
    if (!error && data) return data;
  }
  return getLocal<Installment>(KEYS.installments, []);
}

export async function addInstallment(inst: Installment, userId?: string): Promise<Installment> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('installments')
      .insert({ ...inst, user_id: userId })
      .select()
      .single();
    if (!error && data) return data;
  }
  const insts = getLocal<Installment>(KEYS.installments, []);
  insts.unshift(inst);
  setLocal(KEYS.installments, insts);
  return inst;
}

export async function updateInstallment(inst: Installment, userId?: string): Promise<Installment> {
  const supabase = getSupabase();
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('installments')
      .update(inst)
      .eq('id', inst.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (!error && data) return data;
  }
  const insts = getLocal<Installment>(KEYS.installments, []);
  const idx = insts.findIndex(i => i.id === inst.id);
  if (idx !== -1) insts[idx] = inst;
  setLocal(KEYS.installments, insts);
  return inst;
}

export async function deleteInstallment(id: string, userId?: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase && userId) {
    await supabase.from('installments').delete().eq('id', id).eq('user_id', userId);
    return;
  }
  const insts = getLocal<Installment>(KEYS.installments, []).filter(i => i.id !== id);
  setLocal(KEYS.installments, insts);
}

// ── Chat Messages ──

export function getChatMessages(): ChatMessage[] {
  return getLocal<ChatMessage>(KEYS.chatMessages, []);
}

export function saveChatMessages(messages: ChatMessage[]) {
  setLocal(KEYS.chatMessages, messages);
}

export function clearChatMessages() {
  localStorage.removeItem(KEYS.chatMessages);
}
