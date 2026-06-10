import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, EditIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { EXPENSE_CATEGORIES } from '@/types';
import { IconBubble, NotionIcon } from '@/components/NotionIcon';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export const Budgets: React.FC = () => {
  const { budgets, transactions, addBudget, updateBudget, deleteBudget } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: '',
    amount: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
  });

  // Calculate actual spending for each budget
  const budgetsWithSpent = budgets.map(b => {
    const now = new Date();
    let start: Date, end: Date;
    switch (b.period) {
      case 'daily': start = new Date(now.setHours(0,0,0,0)); end = new Date(now.setHours(23,59,59,999)); break;
      case 'weekly': start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
      case 'yearly': start = startOfYear(now); end = endOfYear(now); break;
      default: start = startOfMonth(now); end = endOfMonth(now);
    }
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === b.category)
      .filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      })
      .reduce((s, t) => s + t.amount, 0);
    return { ...b, spent };
  });

  const totalBudget = budgetsWithSpent.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const handleOpen = (budgetId?: string) => {
    if (budgetId) {
      const b = budgets.find(x => x.id === budgetId);
      if (b) {
        setForm({ category: b.category, amount: b.amount.toString(), period: b.period });
        setEditId(budgetId);
      }
    } else {
      setForm({ category: '', amount: '', period: 'monthly' });
      setEditId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount) return;

    const now = new Date();

    if (editId) {
      const existing = budgets.find(b => b.id === editId)!;
      await updateBudget({
        ...existing,
        category: form.category,
        amount: parseFloat(form.amount),
        period: form.period,
      });
    } else {
      await addBudget({
        category: form.category,
        amount: parseFloat(form.amount),
        spent: 0,
        period: form.period,
        start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      });
    }
    setShowModal(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Budget</h2>
          <p className="text-sm text-zinc-500">{budgets.length} budget aktif</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> Tambah Budget
        </button>
      </div>

      {/* Overview card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Budget vs Pengeluaran</span>
          <span className={`text-sm font-medium ${overallPct > 100 ? 'text-red-500' : overallPct > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {overallPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${overallPct > 100 ? 'bg-red-500' : overallPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Terpakai: {formatCurrency(totalSpent)}</span>
          <span className="text-zinc-500">Budget: {formatCurrency(totalBudget)}</span>
        </div>
      </div>

      {/* Budget cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {budgetsWithSpent.map(b => {
          const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
          const isOver = b.spent > b.amount;
          const remaining = b.amount - b.spent;
          const cat = EXPENSE_CATEGORIES.find(c => c.name === b.category);

          return (
            <div key={b.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconBubble name={cat?.icon} color={cat?.color} />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{b.category}</p>
                    <p className="text-xs text-zinc-500 capitalize">{b.period}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpen(b.id)} className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors">
                    <EditIcon size={14} />
                  </button>
                  <button onClick={() => deleteBudget(b.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between mb-2">
                <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatCurrency(b.spent)}</span>
                <span className="text-sm text-zinc-500">/ {formatCurrency(b.amount)}</span>
              </div>

              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              <p className={`text-xs ${isOver ? 'text-red-500' : 'text-zinc-500'}`}>
                {isOver ? `Melebihi ${formatCurrency(Math.abs(remaining))}` : `Sisa ${formatCurrency(remaining)}`}
              </p>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm">Belum ada budget</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Budget' : 'Tambah Budget'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Kategori Pengeluaran</label>
              <span className="text-[11px] text-zinc-400">Nama kategori tetap</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-colors border ${form.category === cat.name
                    ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <NotionIcon name={cat.icon} size={18} />
                  <span className="truncate w-full text-center">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Jumlah Budget</label>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
              <span className="text-sm text-zinc-500">Rp</span>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Periode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, period: p }))}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors border ${form.period === p
                    ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {editId ? 'Simpan Perubahan' : 'Tambah Budget'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
