import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendAIMessage } from '@/lib/ai';
import { SendIcon, CloseIcon, SparkleIcon, TrashIcon, CheckIcon } from './Icons';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { getTranslation, formatCurrency } from '@/lib/i18n';

const FinMateLogo: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="url(#chat-logo-grad)" />
    <path d="M8 12h6M8 16h10M8 20h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 8l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="chat-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
    </defs>
  </svg>
);

type PendingAction = { type: string; data: Record<string, unknown> };

export const ChatPanel: React.FC = () => {
  const {
    chatOpen, setChatOpen, chatMessages, addChatMessage, clearChat,
    transactions, accounts, budgets, debts, goals, installments,
    addTransaction, updateTransaction, deleteTransaction, language,
  } = useStore();
  const t = getTranslation(language);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (chatOpen) textareaRef.current?.focus();
  }, [chatOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    addChatMessage({ role: 'user', content: trimmed });
    setInput('');
    setIsTyping(true);

    try {
      const userMsgs = [...chatMessages, { id: '', role: 'user' as const, content: trimmed, timestamp: '' }];
      const response = await sendAIMessage(userMsgs, accounts, transactions, budgets, debts, goals, installments);
      addChatMessage({ role: 'assistant', content: response.content });
      if (response.actions?.length) setPendingActions(response.actions);
    } catch {
      addChatMessage({ role: 'assistant', content: t.chat.errorOccurred });
    } finally {
      setIsTyping(false);
    }
  };

  const resolveFullId = (shortId: string): string => {
    const found = transactions.find(t => t.id.startsWith(shortId));
    return found?.id || shortId;
  };

  const handleConfirmActions = async () => {
    for (const action of pendingActions) {
      if (action.type === 'add_transaction') {
        const data = action.data;
        const type = (data.type as string) || 'expense';
        const category = (data.category as string) || 'Lainnya';
        const amount = Number(data.amount) || 0;
        const description = (data.description as string) || '';
        const date = (data.date as string) || format(new Date(), 'yyyy-MM-dd');
        const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
        const matched = allCats.find(c => c.name.toLowerCase() === category.toLowerCase());
        const finalCategory = matched ? matched.name : category;
        const shortAccountId = (data.account_id as string) || '';
        const accountId = shortAccountId
          ? (accounts.find(a => a.id.startsWith(shortAccountId))?.id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '')
          : (accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '');

        await addTransaction({
          type: type as 'income' | 'expense',
          category: finalCategory,
          amount,
          description,
          date,
          account_id: accountId,
        });

        const typeLabel = type === 'income'
          ? (language === 'id' ? 'Pemasukan' : 'Income')
          : (language === 'id' ? 'Pengeluaran' : 'Expense');
        addChatMessage({
          role: 'assistant',
          content: `✅ ${t.chat.transactionSaved}\n\n**${typeLabel}**: ${formatCurrency(amount, language)}\n**${t.common.category}**: ${finalCategory}\n**${t.common.description}**: ${description}\n**${t.common.date}**: ${date}`,
        });
      }

      if (action.type === 'edit_transaction') {
        const data = action.data;
        const fullId = resolveFullId(data.id as string);
        const existing = transactions.find(t => t.id === fullId);
        if (existing) {
          const updated = {
            ...existing,
            ...(data.type        && { type: data.type as 'income' | 'expense' }),
            ...(data.category    && { category: data.category as string }),
            ...(data.amount      && { amount: Number(data.amount) }),
            ...(data.description && { description: data.description as string }),
            ...(data.date        && { date: data.date as string }),
          };
          await updateTransaction(updated);
          addChatMessage({
            role: 'assistant',
            content: `✅ Transaksi berhasil diupdate.\n\n**${updated.description}** — ${formatCurrency(updated.amount, language)} (${updated.date})`,
          });
        } else {
          addChatMessage({ role: 'assistant', content: '❌ Transaksi tidak ditemukan.' });
        }
      }

      if (action.type === 'delete_transaction') {
        const fullId = resolveFullId(action.data.id as string);
        const existing = transactions.find(t => t.id === fullId);
        if (existing) {
          await deleteTransaction(fullId);
          addChatMessage({
            role: 'assistant',
            content: `🗑️ Transaksi "${existing.description}" (${formatCurrency(existing.amount, language)}) berhasil dihapus.`,
          });
        } else {
          addChatMessage({ role: 'assistant', content: '❌ Transaksi tidak ditemukan.' });
        }
      }
    }
    setPendingActions([]);
  };

  const handleRejectActions = () => {
    addChatMessage({ role: 'assistant', content: t.chat.transactionCancelled });
    setPendingActions([]);
  };

  const getActionLabel = (action: PendingAction): string => {
    switch (action.type) {
      case 'add_transaction':    return language === 'id' ? '➕ Tambah Transaksi' : '➕ Add Transaction';
      case 'edit_transaction':   return language === 'id' ? '✏️ Edit Transaksi'   : '✏️ Edit Transaction';
      case 'delete_transaction': return language === 'id' ? '🗑️ Hapus Transaksi'  : '🗑️ Delete Transaction';
      default: return action.type;
    }
  };

  if (!chatOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <FinMateLogo size={32} />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.chat.title}</h3>
            <p className="text-xs text-zinc-500">{t.chat.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Clear chat">
            <TrashIcon size={16} />
          </button>
          <button onClick={() => setChatOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <FinMateLogo size={56} />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2 mt-4">{t.chat.greeting}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{t.chat.intro}</p>
            <div className="space-y-2 w-full">
              {t.chat.suggestions.map((suggestion, i) => (
                <button key={i}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors border border-zinc-200 dark:border-zinc-800">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-emerald-200' : 'text-zinc-400'}`}>
                {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
              </div>
            </div>
          </div>
        ))}

        {/* Pending actions card */}
        {pendingActions.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">
              {language === 'id' ? 'Konfirmasi aksi berikut:' : 'Confirm the following actions:'}
            </p>
            <div className="space-y-2 mb-4">
              {pendingActions.map((action, i) => (
                <div key={i} className="text-sm text-emerald-700 dark:text-emerald-400 bg-white/50 dark:bg-zinc-800/50 rounded-lg p-3 space-y-1">
                  <p className="font-semibold">{getActionLabel(action)}</p>
                  {action.type === 'add_transaction' && (
                    <>
                      <p>{t.common.type}: <span className="font-medium">{action.data.type === 'income' ? (language === 'id' ? 'Pemasukan' : 'Income') : (language === 'id' ? 'Pengeluaran' : 'Expense')}</span></p>
                      <p>{t.common.amount}: <span className="font-medium">{formatCurrency(Number(action.data.amount || 0), language)}</span></p>
                      <p>{t.common.category}: <span className="font-medium">{String(action.data.category || '')}</span></p>
                      <p>{t.common.description}: <span className="font-medium">{String(action.data.description || '')}</span></p>
                      <p>{t.common.date}: <span className="font-medium">{String(action.data.date || '')}</span></p>
                    </>
                  )}
                  {action.type === 'edit_transaction' && (
                    <>
                      <p>ID: <span className="font-medium font-mono">{String(action.data.id || '')}</span></p>
                      {action.data.amount      && <p>{t.common.amount}: <span className="font-medium">{formatCurrency(Number(action.data.amount), language)}</span></p>}
                      {action.data.description && <p>{t.common.description}: <span className="font-medium">{String(action.data.description)}</span></p>}
                      {action.data.category    && <p>{t.common.category}: <span className="font-medium">{String(action.data.category)}</span></p>}
                      {action.data.date        && <p>{t.common.date}: <span className="font-medium">{String(action.data.date)}</span></p>}
                    </>
                  )}
                  {action.type === 'delete_transaction' && (
                    <p>ID: <span className="font-medium font-mono">{String(action.data.id || '')}</span></p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmActions} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <CheckIcon size={16} /> {t.common.confirm}
              </button>
              <button onClick={handleRejectActions} className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors">
                <CloseIcon size={16} /> {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — Enter = newline, tombol Send = kirim */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none resize-none leading-relaxed py-1"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 mb-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-30 transition-colors shrink-0"
          >
            <SendIcon size={18} />
          </button>
        </div>
        <p className="text-xs text-zinc-400 text-center mt-1.5">
          {language === 'id' ? 'Enter untuk baris baru · Tombol kirim untuk mengirim' : 'Enter for new line · Send button to send'}
        </p>
      </div>
    </div>
  );
};
