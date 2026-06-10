import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, CheckIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { IconBubble } from '@/components/NotionIcon';
import { format, addMonths } from 'date-fns';
import { getTranslation, formatCurrency } from '@/lib/i18n';

export const Installments: React.FC = () => {
  const { installments, accounts, addInstallment, deleteInstallment, payInstallment, language } = useStore();
  const t = getTranslation(language);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    total_amount: '',
    down_payment: '0',
    monthly_payment: '',
    duration_months: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    account_id: '',
  });

  const activeInstallments = useMemo(() => installments.filter(i => !i.is_completed), [installments]);
  const completedInstallments = useMemo(() => installments.filter(i => i.is_completed), [installments]);

  const totalMonthlyBurden = activeInstallments.reduce((s, i) => s + i.monthly_payment, 0);
  const totalRemaining = activeInstallments.reduce((s, i) => s + (i.duration_months - i.paid_months) * i.monthly_payment, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.total_amount || !form.monthly_payment || !form.duration_months) return;

    await addInstallment({
      name: form.name,
      total_amount: parseFloat(form.total_amount),
      down_payment: parseFloat(form.down_payment) || 0,
      monthly_payment: parseFloat(form.monthly_payment),
      duration_months: parseInt(form.duration_months),
      paid_months: 0,
      start_date: form.start_date,
      account_id: form.account_id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '',
      category: 'Cicilan',
      is_completed: false,
    });

    setForm({ name: '', total_amount: '', down_payment: '0', monthly_payment: '', duration_months: '', start_date: format(new Date(), 'yyyy-MM-dd'), account_id: '' });
    setShowModal(false);
  };

  // Auto-calculate monthly payment
  const handleTotalChange = (total: string) => {
    setForm(f => {
      const totalNum = parseFloat(total) || 0;
      const dp = parseFloat(f.down_payment) || 0;
      const months = parseInt(f.duration_months) || 1;
      const monthly = months > 0 ? Math.ceil((totalNum - dp) / months) : 0;
      return { ...f, total_amount: total, monthly_payment: monthly > 0 ? monthly.toString() : '' };
    });
  };

  const handleDurationChange = (duration: string) => {
    setForm(f => {
      const totalNum = parseFloat(f.total_amount) || 0;
      const dp = parseFloat(f.down_payment) || 0;
      const months = parseInt(duration) || 1;
      const monthly = months > 0 ? Math.ceil((totalNum - dp) / months) : 0;
      return { ...f, duration_months: duration, monthly_payment: monthly > 0 ? monthly.toString() : '' };
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.installments.title}</h2>
          <p className="text-sm text-zinc-500">{activeInstallments.length} {t.installments.activeInstallments}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> {t.installments.addInstallment}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80">{t.installments.totalMonthlyBurden}</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalMonthlyBurden, language)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs text-zinc-500">{t.installments.totalRemaining}</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(totalRemaining, language)}</p>
        </div>
      </div>

      {/* Active installments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeInstallments.map(inst => {
          const progress = (inst.paid_months / inst.duration_months) * 100;
          const nextPaymentDate = addMonths(new Date(inst.start_date), inst.paid_months);
          const remainingAmount = (inst.duration_months - inst.paid_months) * inst.monthly_payment;

          return (
            <div key={inst.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconBubble name="bill" color="#059669" size="md" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{inst.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(inst.monthly_payment, language)}/{t.common.monthly.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => payInstallment(inst.id)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors"
                    title={t.installments.payInstallment}
                  >
                    <CheckIcon size={14} />
                  </button>
                  <button onClick={() => deleteInstallment(inst.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between mb-2">
                <span className="text-lg font-bold text-zinc-900 dark:text-white">{inst.paid_months}/{inst.duration_months}</span>
                <span className="text-sm text-zinc-500">{t.installments.remainingInstallments}: {inst.duration_months - inst.paid_months}</span>
              </div>

              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex justify-between text-xs text-zinc-500">
                <span>{t.installments.nextPayment}: {format(nextPaymentDate, 'dd MMM yyyy')}</span>
                <span>{t.common.remaining}: {formatCurrency(remainingAmount, language)}</span>
              </div>
            </div>
          );
        })}

        {activeInstallments.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
            <p className="text-sm">{t.common.noData}</p>
          </div>
        )}
      </div>

      {/* Completed */}
      {completedInstallments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{t.common.completed}</h3>
          <div className="space-y-2">
            {completedInstallments.slice(0, 5).map(inst => (
              <div key={inst.id} className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <IconBubble name="bill" color="#71717a" size="sm" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{inst.name}</span>
                </div>
                <span className="text-sm font-medium text-zinc-500">{formatCurrency(inst.total_amount, language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={t.installments.addInstallment}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.itemName}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="iPhone 15, Motor, dll"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.totalAmount}</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-xs text-zinc-500">Rp</span>
                <input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.downPayment}</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-xs text-zinc-500">Rp</span>
                <input
                  type="number"
                  value={form.down_payment}
                  onChange={(e) => setForm(f => ({ ...f, down_payment: e.target.value }))}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.duration}</label>
              <input
                type="number"
                value={form.duration_months}
                onChange={(e) => handleDurationChange(e.target.value)}
                placeholder="12"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.monthlyPayment}</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-xs text-zinc-500">Rp</span>
                <input
                  type="number"
                  value={form.monthly_payment}
                  onChange={(e) => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.installments.startDate}</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none"
            />
          </div>

          {accounts.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.transactions.selectAccount}</label>
              <select
                value={form.account_id}
                onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none"
              >
                <option value="">{t.transactions.selectAccount}</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {t.common.save}
          </button>
        </form>
      </Modal>
    </div>
  );
};
