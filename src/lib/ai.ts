import { ChatMessage, Transaction, Account, Budget, Debt, Goal, Installment } from '@/types';

// ─── HARDCODED API KEYS ──────────────────────────────────────
const CLAUDE_API_KEY = 'YOUR_CLAUDE_KEY';
const GEMINI_API_KEY = 'AQ.Ab8RN6LSMH7Gb_iq-geyvABIM3Km5Nuq7Kt1koZfd89Byk-HkQ';
// ─────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'gemini';

export const AI_MODELS: Record<AIProvider, { id: string; label: string }[]> = {
  claude: [
    { id: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash',                    label: 'Gemini 2.5 Flash (20 RPD)' },
    { id: 'gemini-3.1-flash-lite-preview-06-17', label: 'Gemini 3.1 Flash Lite (500 RPD)' },
    { id: 'gemini-2.5-flash-lite',               label: 'Gemini 2.5 Flash Lite (20 RPD)' },
  ],
};

export function getAIProvider(): AIProvider {
  return (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
}

export function getAIModel(): string {
  return localStorage.getItem('ai_model') || 'gemini-2.5-flash';
}

// ── System Prompt ──────────────────────────────────────────────

function getSystemPrompt(
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[],
  debts: Debt[],
  goals: Goal[],
  installments: Installment[]
): string {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTx = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthlyIncome  = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const txList = transactions.slice(0, 30).map(t =>
    `- [ID:${t.id.slice(0,8)}] ${t.date}: ${t.type === 'income' ? '+' : '-'}Rp${t.amount.toLocaleString('id-ID')} | ${t.category} | ${t.description} | akun: ${accounts.find(a => a.id === t.account_id)?.name || '-'}`
  ).join('\n');

  const accountList = accounts.map(a =>
    `- [ID:${a.id.slice(0,8)}] ${a.name} (${a.type}): Rp${a.balance.toLocaleString('id-ID')}`
  ).join('\n');

  const budgetList = budgets.length
    ? budgets.map(b => `- ${b.category}: Rp${b.spent.toLocaleString('id-ID')} / Rp${b.amount.toLocaleString('id-ID')} (${b.period})`).join('\n')
    : 'Belum ada budget';

  const debtList = debts.filter(d => !d.is_paid).slice(0, 10).map(d =>
    `- ${d.name}: Rp${d.amount.toLocaleString('id-ID')} (${d.type === 'debt' ? 'hutang' : 'piutang'})`
  ).join('\n') || 'Tidak ada';

  const goalList = goals.slice(0, 5).map(g =>
    `- ${g.name}: Rp${g.current_amount.toLocaleString('id-ID')} / Rp${g.target_amount.toLocaleString('id-ID')}`
  ).join('\n') || 'Tidak ada';

  const installList = installments.filter(i => !i.is_completed).slice(0, 5).map(i =>
    `- ${i.name}: Rp${i.monthly_payment.toLocaleString('id-ID')}/bulan (${i.paid_months}/${i.duration_months} bulan)`
  ).join('\n') || 'Tidak ada';

  return `Kamu adalah asisten keuangan personal bernama "FinAI" yang cerdas dan ramah. Kamu bisa membantu segala hal — tidak terbatas pada keuangan saja.

DATA KEUANGAN PENGGUNA (real-time):
Total Saldo: Rp${totalBalance.toLocaleString('id-ID')}
Pemasukan Bulan Ini: Rp${monthlyIncome.toLocaleString('id-ID')}
Pengeluaran Bulan Ini: Rp${monthlyExpense.toLocaleString('id-ID')}

AKUN:
${accountList || 'Belum ada akun'}

BUDGET:
${budgetList}

HUTANG/PIUTANG AKTIF:
${debtList}

TARGET TABUNGAN:
${goalList}

CICILAN BERJALAN:
${installList}

TRANSAKSI TERAKHIR (30):
${txList || 'Belum ada transaksi'}

KEMAMPUAN AKSI (gunakan format ini untuk memodifikasi data):
1. Tambah transaksi:
   [ACTION:ADD_TRANSACTION]{"type":"expense/income","category":"...","amount":angka,"description":"...","date":"YYYY-MM-DD","account_id":"8-char-id-akun"}[/ACTION]

2. Edit transaksi (gunakan 8 karakter pertama ID dari daftar transaksi di atas):
   [ACTION:EDIT_TRANSACTION]{"id":"8charID","type":"expense/income","category":"...","amount":angka,"description":"...","date":"YYYY-MM-DD"}[/ACTION]

3. Hapus transaksi:
   [ACTION:DELETE_TRANSACTION]{"id":"8charID"}[/ACTION]

KATEGORI:
- Pengeluaran: Makanan & Minuman, Transportasi, Belanja, Hiburan, Kesehatan, Pendidikan, Tagihan, Rumah Tangga, Pakaian, Donasi, Investasi, Lainnya
- Pemasukan: Gaji, Freelance, Bisnis, Investasi, Hadiah, Lainnya

PANDUAN:
- Utamakan Bahasa Indonesia, tapi ikuti bahasa yang dipakai user
- Format angka selalu pakai Rp
- Untuk edit/hapus: cari ID yang cocok dari daftar transaksi, lalu gunakan 8 karakter pertamanya
- Selalu konfirmasi sebelum aksi dieksekusi dengan menampilkan detail lengkap
- Bisa bantu hal umum di luar keuangan juga`;
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
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.filter(m => m.role !== 'system'),
    }),
  });
  if (!response.ok) throw new Error(`Claude API Error: ${response.status} - ${await response.text()}`);
  const data = await response.json();
  return data?.content?.[0]?.text || '';
}

// ── Gemini API ─────────────────────────────────────────────────

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
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system'),
        ],
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini API Error: ${response.status} - ${await response.text()}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ── Action parser ──────────────────────────────────────────────

function parseActions(text: string): { content: string; actions: { type: string; data: Record<string, unknown> }[] } {
  const actions: { type: string; data: Record<string, unknown> }[] = [];
  const actionTypes = ['ADD_TRANSACTION', 'EDIT_TRANSACTION', 'DELETE_TRANSACTION'];

  let content = text;
  for (const actionType of actionTypes) {
    const regex = new RegExp(`\\[ACTION:${actionType}\\](.*?)\\[\\/ACTION\\]`, 'gs');
    content = content.replace(regex, (_, json) => {
      try {
        actions.push({ type: actionType.toLowerCase(), data: JSON.parse(json) });
      } catch { /* ignore */ }
      return '';
    });
  }

  return { content: content.trim(), actions };
}

// ── Main export ────────────────────────────────────────────────

export async function sendAIMessage(
  chatMessages: ChatMessage[],
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[],
  debts: Debt[],
  goals: Goal[],
  installments: Installment[]
): Promise<{ content: string; actions?: { type: string; data: Record<string, unknown> }[] }> {
  const provider = getAIProvider();
  const model = getAIModel();
  const systemPrompt = getSystemPrompt(accounts, transactions, budgets, debts, goals, installments);
  const messages = chatMessages.slice(-30).map(m => ({ role: m.role, content: m.content }));

  let responseText: string;
  try {
    responseText = provider === 'claude'
      ? await callClaude(systemPrompt, messages, model)
      : await callGemini(systemPrompt, messages, model);
  } catch (error) {
    return { content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Pastikan API key sudah benar.` };
  }

  const { content, actions } = parseActions(responseText);
  return { content, actions: actions.length ? actions : undefined };
}
