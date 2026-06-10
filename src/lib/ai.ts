import { ChatMessage, Transaction, Account, Budget } from '@/types';

interface AIRequestOptions {
  apiKey: string;
  endpoint: string;
  messages: { role: string; content: string }[];
}

function getSystemPrompt(accounts: Account[], transactions: Transaction[], budgets: Budget[]): string {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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

async function callConfiguredAI(options: AIRequestOptions): Promise<string> {
  const response = await fetch(options.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      messages: options.messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.content ||
    data?.text ||
    data?.response ||
    JSON.stringify(data)
  );
}

export async function sendAIMessage(
  chatMessages: ChatMessage[],
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[]
): Promise<{ content: string; action?: { type: string; data: Record<string, unknown> } }> {
  const apiKey = localStorage.getItem('ai_api_key') || '';
  const endpoint = localStorage.getItem('ai_endpoint') || '';

  if (!apiKey || !endpoint) {
    return {
      content: 'Konfigurasi AI belum lengkap. Buka Settings lalu isi API key dan URL endpoint AI.',
    };
  }

  const systemPrompt = getSystemPrompt(accounts, transactions, budgets);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatMessages.slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const options: AIRequestOptions = {
    apiKey,
    endpoint,
    messages,
  };

  try {
    var responseText = await callConfiguredAI(options);
  } catch (error) {
    return {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Pastikan API key dan URL endpoint sudah benar.`,
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
