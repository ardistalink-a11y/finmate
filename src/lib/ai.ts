import { ChatMessage, Transaction, Account, Budget } from '@/types';

// ─── HARDCODED API KEYS ──────────────────────────────────────
const CLAUDE_API_KEY = 'YOUR_CLAUDE_KEY';
const GEMINI_API_KEY = 'AQ.Ab8RN6LSMH7Gb_iq-geyvABIM3Km5Nuq7Kt1koZfd89Byk-HkQ';
// ─────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'gemini';

export const AI_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
  claude: [
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5' },
  ],
  gemini: [
    { id: 'gemini-3.1-flash-lite-preview-06-17', label: 'Gemini 3.1 Flash Lite (500 RPD)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (20 RPD)' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (20 RPD)' },
  ],
};

export function getAIProvider(): AIProvider {
  return (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
}

export function getAIModel(): string {
  return localStorage.getItem('ai_model') || 'gemini-3.1-flash-lite-preview-06-17';
}

// ── System Prompt ──────────────────────────────────────────────

function getSystemPrompt(accounts: Account[], transactions: Transaction[], budgets: Budget[]): string {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthlyIncome    = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense   = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const recentTx = transactions.slice(0, 10).map(t =>
    `- ${t.date}: ${t.type === 'income' ? '+' : '-'}Rp${t.amount.toLocaleString('id-ID')} (${t.category}) ${t.description}`
  ).join('\n');

  const accountList = accounts.map(a =>
    `- ${a.name} (${a.type}): Rp${a.balance.toLocaleString('id-ID')}`
  ).join('\n');

  const budgetList = budgets.map(b =>
    `- ${b.category}: Rp${b.spent.toLocaleString('id-ID')} / Rp${b.amount.toLocaleString('id-ID')} (${b.period})`
  ).join('\n');

  return `Kamu adalah asisten keuangan personal yang cerdas bernama "FinAI". Kamu membantu pengguna mengelola keuangan mereka dengan bijak.

KONTEKS KEUANGAN PENGGUNA:
Total Saldo: Rp${totalBalance.toLocaleString('id-ID')}
Pemasukan Bulan Ini: Rp${monthlyIncome.toLocaleString('id-ID')}
Pengeluaran Bulan Ini: Rp${monthlyExpense.toLocaleString('id-ID')}

AKUN:
${accountList || 'Belum ada akun'}

BUDGET:
${budgetList || 'Belum ada budget'}

TRANSAKSI TERAKHIR:
${recentTx || 'Belum ada transaksi'}

KEMAMPUAN:
1. Kamu bisa membantu mencatat transaksi. Jika user ingin mencatat transaksi, respond dengan JSON action.
2. Kamu bisa memberikan analisis dan saran keuangan.
3. Kamu bisa membantu merencanakan budget.

ATURAN RESPONSE:
- Jawab dalam Bahasa Indonesia
- Gunakan format currency IDR (Rp)
- Jika user minta catat transaksi, extract informasi dan respond dengan format:
  [ACTION:ADD_TRANSACTION]{"type":"expense/income","category":"kategori","amount":angka,"description":"deskripsi","date":"YYYY-MM-DD"}[/ACTION]
- Kategori expense: Makanan & Minuman, Transportasi, Belanja, Hiburan, Kesehatan, Pendidikan, Tagihan, Rumah Tangga, Pakaian, Donasi, Investasi, Lainnya
- Kategori income: Gaji, Freelance, Bisnis, Investasi, Hadiah, Lainnya
- Berikan saran yang actionable dan spesifik
- Jika tidak jelas, tanyakan detail yang diperlukan`;
}

// ── Claude API ─────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system'),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text || '';
}

// ── Gemini API (OpenAI-compatible) ─────────────────────────────

async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string
): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system'),
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ── Main export ────────────────────────────────────────────────

export async function sendAIMessage(
  chatMessages: ChatMessage[],
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[]
): Promise<{ content: string; action?: { type: string; data: Record<string, unknown> } }> {
  const provider = getAIProvider();
  const model    = getAIModel();
  const systemPrompt = getSystemPrompt(accounts, transactions, budgets);

  const messages = chatMessages.slice(-20).map(m => ({
    role: m.role,
    content: m.content,
  }));

  let responseText: string;

  try {
    if (provider === 'claude') {
      responseText = await callClaude(systemPrompt, messages, model);
    } else {
      responseText = await callGemini(systemPrompt, messages, model);
    }
  } catch (error) {
    return {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Pastikan API key sudah benar di kode.`,
    };
  }

  // Parse action from response
  const actionMatch = responseText.match(/\[ACTION:ADD_TRANSACTION\](.*?)\[\/ACTION\]/s);
  let action: { type: string; data: Record<string, unknown> } | undefined;

  if (actionMatch) {
    try {
      const actionData = JSON.parse(actionMatch[1]);
      action = { type: 'add_transaction', data: actionData };
      responseText = responseText.replace(/\[ACTION:ADD_TRANSACTION\].*?\[\/ACTION\]/s, '').trim();
    } catch {
      // Invalid JSON, ignore action
    }
  }

  return { content: responseText, action };
}
