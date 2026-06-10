export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: string;
  account_id: string;
  to_account_id?: string;
  created_at: string;
  tags?: string[];
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'cash' | 'bank' | 'e-wallet' | 'credit-card' | 'investment' | 'savings';
  balance: number;
  currency: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  spent: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  type: 'debt' | 'receivable'; // debt = hutang (I owe), receivable = piutang (owed to me)
  person_name: string;
  amount: number;
  description: string;
  date: string;
  due_date?: string;
  account_id: string;
  is_paid: boolean;
  paid_date?: string;
  created_at: string;
}

export interface Installment {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  down_payment: number;
  monthly_payment: number;
  duration_months: number;
  paid_months: number;
  start_date: string;
  account_id: string;
  category: string;
  is_completed: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: ChatAction;
}

export interface ChatAction {
  type: 'add_transaction' | 'add_account' | 'set_budget' | 'summary' | 'advice';
  data?: Partial<Transaction> & Partial<Account> & Partial<Budget>;
  confirmed?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'custom';
  model: string;
  endpoint: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  ai_api_key: string;
  ai_model: string;
  ai_provider: string;
  ai_endpoint: string;
  supabase_url: string;
  supabase_anon_key: string;
}

export const EXPENSE_CATEGORIES = [
  { name: 'Makanan & Minuman', icon: 'food', color: '#ef4444' },
  { name: 'Transportasi', icon: 'transport', color: '#f97316' },
  { name: 'Belanja', icon: 'shopping', color: '#eab308' },
  { name: 'Hiburan', icon: 'entertainment', color: '#22c55e' },
  { name: 'Kesehatan', icon: 'health', color: '#06b6d4' },
  { name: 'Pendidikan', icon: 'education', color: '#3b82f6' },
  { name: 'Tagihan', icon: 'bill', color: '#10b981' },
  { name: 'Rumah Tangga', icon: 'home', color: '#ec4899' },
  { name: 'Pakaian', icon: 'clothing', color: '#14b8a6' },
  { name: 'Donasi', icon: 'donation', color: '#f43f5e' },
  { name: 'Investasi', icon: 'investment', color: '#10b981' },
  { name: 'Cicilan', icon: 'bill', color: '#059669' },
  { name: 'Lainnya', icon: 'other', color: '#6b7280' },
] as const;

export const INCOME_CATEGORIES = [
  { name: 'Gaji', icon: 'salary', color: '#22c55e' },
  { name: 'Freelance', icon: 'freelance', color: '#3b82f6' },
  { name: 'Bisnis', icon: 'business', color: '#10b981' },
  { name: 'Investasi', icon: 'investment', color: '#f97316' },
  { name: 'Hadiah', icon: 'gift', color: '#ec4899' },
  { name: 'Lainnya', icon: 'other', color: '#6b7280' },
] as const;

export const ACCOUNT_TYPES = [
  { type: 'cash', name: 'Tunai', icon: 'cash' },
  { type: 'bank', name: 'Bank', icon: 'bank' },
  { type: 'e-wallet', name: 'E-Wallet', icon: 'wallet' },
  { type: 'credit-card', name: 'Kartu Kredit', icon: 'credit-card' },
  { type: 'investment', name: 'Investasi', icon: 'investment' },
  { type: 'savings', name: 'Tabungan', icon: 'savings' },
] as const;

export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', model: 'gpt-3.5-turbo', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', endpoint: 'https://api.anthropic.com/v1/messages' },
  { id: 'claude-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic', model: 'claude-3-5-haiku-20241022', endpoint: 'https://api.anthropic.com/v1/messages' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'google', model: 'gemini-1.5-pro', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
  { id: 'gemini-flash', name: 'Gemini 1.5 Flash', provider: 'google', model: 'gemini-1.5-flash', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
  { id: 'groq-llama', name: 'Llama 3.1 70B (Groq)', provider: 'groq', model: 'llama-3.1-70b-versatile', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
  { id: 'groq-mixtral', name: 'Mixtral 8x7B (Groq)', provider: 'groq', model: 'mixtral-8x7b-32768', endpoint: 'https://api.groq.com/openai/v1/chat/completions' },
];
