import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, CheckIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { IconBubble } from '@/components/NotionIcon';
import { format, differenceInDays } from 'date-fns';
import { getTranslation, formatCurrency } from '@/lib/i18n';

export const Debts: React.FC = () => {
  const { debts, accounts, addDebt, updateDebt, deleteDebt, language } = useStore();
  const t = getTranslation(language);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'debt' | 'receivable'>('all');

  const [form, setForm] = useState({
    type: 'debt' as 'debt' | 'receivable',
    person_name: '',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    account_id: '',
  });

  const filteredDebts = useMemo(() => {
    let items = debts.filter(d => !d.is_paid);
    if (filter !== 'all') items = items.filter(d => d.type === filter);
    return items;
  }, [debts, filter]);

  const paidDebts = debts.filter(d => d.is_paid);

  const totalDebt = debts.filter(d => d.type === 'debt' && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const totalReceivable = debts.filter(d => d.type === 'receivable' && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const netPosition = totalReceivable - totalDebt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person_name || !form.amount) return;

    await addDebt({
      type: form.type,
      person_name: form.person_name,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      due_date: form.due_date || undefined,
      account_id: form.account_id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '',
      is_paid: false,
    });

    setForm({ type: 'debt', person_name: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), due_date: '', account_id: '' });
    setShowModal(false);
  };

  const handleMarkPaid = async (id: string) => {
    const debt = debts.find(d => d.id === id);
    if (debt) {
      await updateDebt({ ...debt, is_paid: true, paid_date: new Date().toISOString().slice(0, 10) });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.debts.title}</h2>
          <p className="text-sm text-zinc-500">{filteredDebts.length} {t.debts.activeItems}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> {t.debts.addDebt}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs text-zinc-500">{t.debts.totalDebt}</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalDebt, language)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs text-zinc-500">{t.debts.totalReceivable}</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalReceivable, language)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs text-zinc-500">{t.debts.netPosition}</p>
          <p className={`text-xl font-bold mt-1 ${netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(netPosition, language)}
          </p>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">{t.debts.notAffectIncomeExpense}</p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 w-fit">
        {[
          { key: 'all' as const, label: t.common.all },
          { key: 'debt' as const, label: t.debts.debt },
          { key: 'receivable' as const, label: t.debts.receivable },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f.key
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Active debts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredDebts.map(debt => {
          const daysUntilDue = debt.due_date ? differenceInDays(new Date(debt.due_date), new Date()) : null;
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

          return (
            <div key={debt.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconBubble
                    name={debt.type === 'debt' ? 'donation' : 'gift'}
                    color={debt.type === 'debt' ? '#ef4444' : '#22c55e'}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{debt.person_name}</p>
                    <p className="text-xs text-zinc-500">
                      {debt.type === 'debt' ? t.debts.debtDesc : t.debts.receivableDesc}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMarkPaid(debt.id)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors"
                    title={t.debts.markAsPaid}
                  >
                    <CheckIcon size={14} />
                  </button>
                  <button onClick={() => deleteDebt(debt.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>

              <p className={`text-xl font-bold ${debt.type === 'debt' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(debt.amount, language)}
              </p>

              {debt.description && (
                <p className="text-xs text-zinc-500 mt-2">{debt.description}</p>
              )}

              {debt.due_date && (
                <p className={`text-xs mt-2 ${isOverdue ? 'text-red-500' : daysUntilDue !== null && daysUntilDue <= 7 ? 'text-amber-500' : 'text-zinc-400'}`}>
                  {t.debts.dueDate}: {format(new Date(debt.due_date), 'dd MMM yyyy')}
                  {daysUntilDue !== null && (
                    <span className="ml-1">
                      ({isOverdue ? t.common.overdue : `${daysUntilDue} ${t.common.daysLeft}`})
                    </span>
                  )}
                </p>
              )}
            </div>
          );
        })}

        {filteredDebts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
            <p className="text-sm">{t.common.noData}</p>
          </div>
        )}
      </div>

      {/* Paid debts */}
      {paidDebts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{t.common.paid}</h3>
          <div className="space-y-2">
            {paidDebts.slice(0, 5).map(debt => (
              <div key={debt.id} className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <IconBubble
                    name={debt.type === 'debt' ? 'donation' : 'gift'}
                    color="#71717a"
                    size="sm"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{debt.person_name}</span>
                </div>
                <span className="text-sm font-medium text-zinc-500">{formatCurrency(debt.amount, language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.debts.addDebt}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['debt', 'receivable'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, type }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${form.type === type
                  ? type === 'debt' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {type === 'debt' ? t.debts.debt : t.debts.receivable}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.debts.personName}</label>
            <input
              type="text"
              value={form.person_name}
              onChange={(e) => setForm(f => ({ ...f, person_name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.amount}</label>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
              <span className="text-sm text-zinc-500">Rp</span>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.description}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.date}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.debts.dueDate}</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {t.common.save}
          </button>
        </form>
      </Modal>
    </div>
  );
};
