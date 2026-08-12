import { create } from 'zustand';
import { Transaction, Account, Budget, Goal, ChatMessage, Debt, Installment } from '@/types';
import * as storage from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '@/lib/i18n';

const createDefaultCashAccount = (userId?: string): Account => ({
  id: uuidv4(),
  user_id: userId || 'local',
  name: 'Cash',
  type: 'cash',
  balance: 0,
  currency: 'IDR',
  icon: 'cash',
  color: '#71717a',
  created_at: new Date().toISOString(),
});

// Multiple components can request data while authentication is finishing. Keep one
// in-flight creation request per user, then recheck Supabase before creating Cash.
// This prevents duplicate automatic Cash accounts from concurrent requests.
const defaultCashCreationByUser = new Map<string, Promise<Account>>();

async function ensureDefaultCashAccount(userId: string, knownAccounts: Account[]): Promise<Account> {
  const existingCash = knownAccounts.find((account) => account.type === 'cash');
  if (existingCash) return existingCash;

  const inFlight = defaultCashCreationByUser.get(userId);
  if (inFlight) return inFlight;

  const creation = (async () => {
    const latestAccounts = await storage.getAccounts(userId);
    const persistedCash = latestAccounts.find((account) => account.type === 'cash');
    if (persistedCash) return persistedCash;

    return storage.addAccount(createDefaultCashAccount(userId), userId);
  })();

  defaultCashCreationByUser.set(userId, creation);
  try {
    return await creation;
  } finally {
    defaultCashCreationByUser.delete(userId);
  }
}

interface AppState {
  // Auth
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  authReady: boolean;
  setUser: (id: string | null, email?: string, name?: string, avatar?: string) => void;
  setAuthReady: (ready: boolean) => void;

  // Theme & Language
  theme: 'light' | 'dark';
  language: Language;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: Language) => void;

  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  // Data
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
  debts: Debt[];
  installments: Installment[];
  chatMessages: ChatMessage[];
  isLoading: boolean;

  // Data actions
  loadData: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addDebt: (debt: Omit<Debt, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateDebt: (debt: Debt) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addToDebt: (id: string, amount: number, description?: string, due_date?: string) => Promise<void>;
  payDebt: (id: string, payAmount: number) => Promise<void>;
  addInstallment: (inst: Omit<Installment, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateInstallment: (inst: Installment) => Promise<void>;
  deleteInstallment: (id: string) => Promise<void>;
  payInstallment: (id: string) => Promise<void>;

  // Chat
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  userId: null,
  userEmail: null,
  userName: null,
  userAvatar: null,
  authReady: false,
  setUser: (id, email, name, avatar) => set({ userId: id, userEmail: email || null, userName: name || null, userAvatar: avatar || null }),
  setAuthReady: (ready) => set({ authReady: ready }),

  // Theme & Language
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  language: (localStorage.getItem('language') as Language) || 'id',
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },

  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),

  // Data
  transactions: [],
  accounts: [],
  budgets: [],
  goals: [],
  debts: [],
  installments: [],
  chatMessages: storage.getChatMessages(),
  isLoading: false,

  loadData: async () => {
    set({ isLoading: true });
    const uid = get().userId ?? '';
    if (!uid) { set({ isLoading: false }); return; }
    const [transactions, rawAccounts, budgets, goals, debts, installments] = await Promise.all([
      storage.getTransactions(uid),
      storage.getAccounts(uid),
      storage.getBudgets(uid),
      storage.getGoals(uid),
      storage.getDebts(uid),
      storage.getInstallments(uid),
    ]);
    let accounts = rawAccounts;
    if (!accounts.some((account) => account.type === 'cash')) {
      const cashAccount = await ensureDefaultCashAccount(uid, accounts);
      if (!accounts.some((account) => account.id === cashAccount.id)) {
        accounts = [cashAccount, ...accounts];
      }
    }
    set({ transactions, accounts, budgets, goals, debts, installments, isLoading: false });
  },

  addTransaction: async (txData) => {
    const uid = get().userId ?? '';
    let accountId = txData.account_id;
    if (!accountId) {
      let cashAccount = get().accounts.find((account) => account.type === 'cash');
      if (!cashAccount) {
        cashAccount = await ensureDefaultCashAccount(uid, get().accounts);
        set((state) => state.accounts.some((account) => account.id === cashAccount!.id)
          ? state
          : { accounts: [cashAccount!, ...state.accounts] });
      }
      accountId = cashAccount.id;
    }
    const tx: Transaction = {
      ...txData,
      account_id: accountId,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addTransaction(tx, uid);
    set(s => ({ transactions: [saved, ...s.transactions] }));

    // Update account balance. A transfer moves funds between two accounts and is not income or expense.
    const accountDeltas: Record<string, number> = {};
    const addAccountDelta = (accountId: string | undefined, delta: number) => {
      if (!accountId) return;
      accountDeltas[accountId] = (accountDeltas[accountId] || 0) + delta;
    };
    if (tx.type === 'transfer') {
      addAccountDelta(tx.account_id, -tx.amount);
      addAccountDelta(tx.to_account_id, tx.amount);
    } else {
      addAccountDelta(tx.account_id, tx.type === 'income' ? tx.amount : -tx.amount);
    }
    const currentAccounts = get().accounts;
    const updatedAccounts = currentAccounts.map((account) => {
      const delta = accountDeltas[account.id] || 0;
      return delta === 0 ? account : { ...account, balance: account.balance + delta };
    });
    const changedAccounts = updatedAccounts.filter((account, index) => account !== currentAccounts[index]);
    await Promise.all(changedAccounts.map((account) => storage.updateAccount(account, uid)));
    if (changedAccounts.length > 0) set({ accounts: updatedAccounts });

    // Update budget spent
    if (tx.type === 'expense') {
      const budgets = get().budgets;
      const budget = budgets.find(b => b.category === tx.category);
      if (budget) {
        const updated = { ...budget, spent: budget.spent + tx.amount };
        await storage.updateBudget(updated, uid);
        set(s => ({ budgets: s.budgets.map(b => b.id === updated.id ? updated : b) }));
      }
    }
  },

  updateTransaction: async (tx) => {
    const uid = get().userId ?? '';
    await storage.updateTransaction(tx, uid);
    set(s => ({ transactions: s.transactions.map(t => t.id === tx.id ? tx : t) }));
  },

  deleteTransaction: async (id) => {
    const uid = get().userId ?? '';
    const tx = get().transactions.find(t => t.id === id);
    await storage.deleteTransaction(id, uid);
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }));

    // Revert account balance. Deleting a transfer returns the amount to the source and removes it from the destination.
    if (tx) {
      const accountDeltas: Record<string, number> = {};
      const addAccountDelta = (accountId: string | undefined, delta: number) => {
        if (!accountId) return;
        accountDeltas[accountId] = (accountDeltas[accountId] || 0) + delta;
      };
      if (tx.type === 'transfer') {
        addAccountDelta(tx.account_id, tx.amount);
        addAccountDelta(tx.to_account_id, -tx.amount);
      } else {
        addAccountDelta(tx.account_id, tx.type === 'income' ? -tx.amount : tx.amount);
      }
      const currentAccounts = get().accounts;
      const updatedAccounts = currentAccounts.map((account) => {
        const delta = accountDeltas[account.id] || 0;
        return delta === 0 ? account : { ...account, balance: account.balance + delta };
      });
      const changedAccounts = updatedAccounts.filter((account, index) => account !== currentAccounts[index]);
      await Promise.all(changedAccounts.map((account) => storage.updateAccount(account, uid)));
      if (changedAccounts.length > 0) set({ accounts: updatedAccounts });
    }
  },

  addAccount: async (accountData) => {
    const uid = get().userId ?? '';
    const account: Account = {
      ...accountData,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addAccount(account, uid);
    set(s => ({ accounts: [...s.accounts, saved] }));
  },

  updateAccount: async (account) => {
    const uid = get().userId ?? '';
    await storage.updateAccount(account, uid);
    set(s => ({ accounts: s.accounts.map(a => a.id === account.id ? account : a) }));
  },

  deleteAccount: async (id) => {
    const account = get().accounts.find(a => a.id === id);
    const cashAccounts = get().accounts.filter(a => a.type === 'cash');
    if (account?.type === 'cash' && cashAccounts.length <= 1) return;
    const uid = get().userId ?? '';
    await storage.deleteAccount(id, uid);
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
  },

  addBudget: async (budgetData) => {
    const uid = get().userId ?? '';
    const budget: Budget = {
      ...budgetData,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addBudget(budget, uid);
    set(s => ({ budgets: [...s.budgets, saved] }));
  },

  updateBudget: async (budget) => {
    const uid = get().userId ?? '';
    await storage.updateBudget(budget, uid);
    set(s => ({ budgets: s.budgets.map(b => b.id === budget.id ? budget : b) }));
  },

  deleteBudget: async (id) => {
    const uid = get().userId ?? '';
    await storage.deleteBudget(id, uid);
    set(s => ({ budgets: s.budgets.filter(b => b.id !== id) }));
  },

  addGoal: async (goalData) => {
    const uid = get().userId ?? '';
    const goal: Goal = {
      ...goalData,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addGoal(goal, uid);
    set(s => ({ goals: [...s.goals, saved] }));
  },

  updateGoal: async (goal) => {
    const uid = get().userId ?? '';
    await storage.updateGoal(goal, uid);
    set(s => ({ goals: s.goals.map(g => g.id === goal.id ? goal : g) }));
  },

  deleteGoal: async (id) => {
    const uid = get().userId ?? '';
    await storage.deleteGoal(id, uid);
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
  },

  // Debts - affect balance but NOT income/expense
  addDebt: async (debtData) => {
    const uid = get().userId ?? '';
    const debt: Debt = {
      ...debtData,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addDebt(debt, uid);
    set(s => ({ debts: [saved, ...s.debts] }));

    // Update account balance
    // debt = I owe money, so I received it -> +balance
    // receivable = someone owes me, so I gave it -> -balance
    const account = get().accounts.find(a => a.id === debt.account_id);
    if (account && !debt.is_paid) {
      const delta = debt.type === 'debt' ? debt.amount : -debt.amount;
      const updated = { ...account, balance: account.balance + delta };
      await storage.updateAccount(updated, uid);
      set(s => ({ accounts: s.accounts.map(a => a.id === updated.id ? updated : a) }));
    }
  },

  updateDebt: async (debt) => {
    const uid = get().userId ?? '';
    const oldDebt = get().debts.find(d => d.id === debt.id);
    await storage.updateDebt(debt, uid);
    set(s => ({ debts: s.debts.map(d => d.id === debt.id ? debt : d) }));

    // Handle payment status change
    if (oldDebt && !oldDebt.is_paid && debt.is_paid) {
      const account = get().accounts.find(a => a.id === debt.account_id);
      if (account) {
        const delta = debt.type === 'debt' ? -debt.amount : debt.amount;
        const updated = { ...account, balance: account.balance + delta };
        await storage.updateAccount(updated, uid);
        set(s => ({ accounts: s.accounts.map(a => a.id === updated.id ? updated : a) }));
      }
    }
  },

  deleteDebt: async (id) => {
    const uid = get().userId ?? '';
    const debt = get().debts.find(d => d.id === id);
    await storage.deleteDebt(id, uid);
    set(s => ({ debts: s.debts.filter(d => d.id !== id) }));

    // Revert balance if not paid
    if (debt && !debt.is_paid) {
      const account = get().accounts.find(a => a.id === debt.account_id);
      if (account) {
        const delta = debt.type === 'debt' ? -debt.amount : debt.amount;
        const updated = { ...account, balance: account.balance + delta };
        await storage.updateAccount(updated, uid);
        set(s => ({ accounts: s.accounts.map(a => a.id === updated.id ? updated : a) }));
      }
    }
  },

  addToDebt: async (id, amount, description, due_date) => {
    const uid = get().userId ?? '';
    const debt = get().debts.find(d => d.id === id);
    if (!debt) return;
    const newDesc = description
      ? (debt.description ? `${debt.description}; ${description}` : description)
      : debt.description;
    const updated = {
      ...debt,
      amount: debt.amount + amount,
      description: newDesc,
      ...(due_date && { due_date }),
    };
    await storage.updateDebt(updated, uid);
    set(s => ({ debts: s.debts.map(d => d.id === id ? updated : d) }));
    // Adjust balance for the added amount
    const account = get().accounts.find(a => a.id === debt.account_id);
    if (account) {
      const delta = debt.type === 'debt' ? amount : -amount;
      const updatedAcc = { ...account, balance: account.balance + delta };
      await storage.updateAccount(updatedAcc, uid);
      set(s => ({ accounts: s.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a) }));
    }
  },

  payDebt: async (id, payAmount) => {
    const uid = get().userId ?? '';
    const debt = get().debts.find(d => d.id === id);
    if (!debt) return;
    const actualPaid = Math.min(payAmount, debt.amount);
    const remaining = debt.amount - actualPaid;
    const isFullyPaid = remaining <= 0;
    const updated = {
      ...debt,
      amount: remaining,
      is_paid: isFullyPaid,
      ...(isFullyPaid && { paid_date: new Date().toISOString().slice(0, 10) }),
    };
    await storage.updateDebt(updated, uid);
    set(s => ({ debts: s.debts.map(d => d.id === id ? updated : d) }));
    // Adjust balance: debt=bayar keluar, receivable=terima masuk
    const account = get().accounts.find(a => a.id === debt.account_id);
    if (account) {
      const delta = debt.type === 'debt' ? -actualPaid : actualPaid;
      const updatedAcc = { ...account, balance: account.balance + delta };
      await storage.updateAccount(updatedAcc, uid);
      set(s => ({ accounts: s.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a) }));
    }
  },

  // Installments
  addInstallment: async (instData) => {
    const uid = get().userId ?? '';
    const inst: Installment = {
      ...instData,
      id: uuidv4(),
      user_id: uid || 'local',
      created_at: new Date().toISOString(),
    };
    const saved = await storage.addInstallment(inst, uid);
    set(s => ({ installments: [saved, ...s.installments] }));
  },

  updateInstallment: async (inst) => {
    const uid = get().userId ?? '';
    await storage.updateInstallment(inst, uid);
    set(s => ({ installments: s.installments.map(i => i.id === inst.id ? inst : i) }));
  },

  deleteInstallment: async (id) => {
    const uid = get().userId ?? '';
    await storage.deleteInstallment(id, uid);
    set(s => ({ installments: s.installments.filter(i => i.id !== id) }));
  },

  payInstallment: async (id) => {
    const uid = get().userId ?? '';
    const inst = get().installments.find(i => i.id === id);
    if (!inst || inst.is_completed) return;

    const newPaidMonths = inst.paid_months + 1;
    const isCompleted = newPaidMonths >= inst.duration_months;
    const updated: Installment = { ...inst, paid_months: newPaidMonths, is_completed: isCompleted };
    await storage.updateInstallment(updated, uid);
    set(s => ({ installments: s.installments.map(i => i.id === id ? updated : i) }));

    // Create expense transaction for installment payment
    await get().addTransaction({
      type: 'expense',
      category: 'Cicilan',
      amount: inst.monthly_payment,
      description: `Cicilan ${inst.name} (${newPaidMonths}/${inst.duration_months})`,
      date: new Date().toISOString().slice(0, 10),
      account_id: inst.account_id,
    });
  },

  // Chat
  addChatMessage: (msgData) => {
    const msg: ChatMessage = {
      ...msgData,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    set(s => {
      const messages = [...s.chatMessages, msg];
      storage.saveChatMessages(messages);
      return { chatMessages: messages };
    });
  },

  clearChat: () => {
    storage.clearChatMessages();
    set({ chatMessages: [] });
  },
}));
