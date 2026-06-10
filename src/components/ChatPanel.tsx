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

export const ChatPanel: React.FC = () => {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, clearChat, transactions, accounts, budgets, addTransaction, language } = useStore();
  const t = getTranslation(language);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; data: Record<string, unknown> } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    addChatMessage({ role: 'user', content: trimmed });
    setInput('');
    setIsTyping(true);

    try {
      const userMsgs = [...chatMessages, { id: '', role: 'user' as const, content: trimmed, timestamp: '' }];
      const response = await sendAIMessage(userMsgs, accounts, transactions, budgets);

      addChatMessage({ role: 'assistant', content: response.content });

      if (response.action) {
        setPendingAction(response.action);
      }
    } catch {
      addChatMessage({ role: 'assistant', content: t.chat.errorOccurred });
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || pendingAction.type !== 'add_transaction') return;

    const data = pendingAction.data;
    const type = (data.type as string) || 'expense';
    const category = (data.category as string) || 'Lainnya';
    const amount = Number(data.amount) || 0;
    const description = (data.description as string) || '';
    const date = (data.date as string) || format(new Date(), 'yyyy-MM-dd');

    const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    const matchedCat = allCats.find(c => c.name.toLowerCase() === category.toLowerCase());
    const finalCategory = matchedCat ? matchedCat.name : category;

    const defaultAccount = accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '';

    await addTransaction({
      type: type as 'income' | 'expense',
      category: finalCategory,
      amount,
      description,
      date,
      account_id: defaultAccount,
    });

    const typeLabel = type === 'income' 
      ? (language === 'id' ? 'Pemasukan' : 'Income') 
      : (language === 'id' ? 'Pengeluaran' : 'Expense');

    addChatMessage({
      role: 'assistant',
      content: `${t.chat.transactionSaved}\n\n**${typeLabel}**: ${formatCurrency(amount, language)}\n**${t.common.category}**: ${finalCategory}\n**${t.common.description}**: ${description}\n**${t.common.date}**: ${date}`,
    });

    setPendingAction(null);
  };

  const handleRejectAction = () => {
    addChatMessage({ role: 'assistant', content: t.chat.transactionCancelled });
    setPendingAction(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {t.chat.intro}
            </p>
            <div className="space-y-2 w-full">
              {t.chat.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors border border-zinc-200 dark:border-zinc-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
              }
            `}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-emerald-200' : 'text-zinc-400'}`}>
                {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
              </div>
            </div>
          </div>
        ))}

        {/* Pending action card */}
        {pendingAction && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">
              {t.chat.confirmTransaction}:
            </p>
            <div className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1 mb-4">
              <p>{t.common.type}: <span className="font-medium">{pendingAction.data.type === 'income' ? (language === 'id' ? 'Pemasukan' : 'Income') : (language === 'id' ? 'Pengeluaran' : 'Expense')}</span></p>
              <p>{t.common.amount}: <span className="font-medium">{formatCurrency(Number(pendingAction.data.amount || 0), language)}</span></p>
              <p>{t.common.category}: <span className="font-medium">{String(pendingAction.data.category || '')}</span></p>
              <p>{t.common.description}: <span className="font-medium">{String(pendingAction.data.description || '')}</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmAction} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <CheckIcon size={16} /> {t.common.confirm}
              </button>
              <button onClick={handleRejectAction} className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors">
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

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-30 transition-colors"
          >
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
