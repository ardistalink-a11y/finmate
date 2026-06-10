import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, FilterIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { IconBubble, NotionIcon } from '@/components/NotionIcon';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
const getCategoryMeta = (type: 'income' | 'expense' | 'transfer', category: string) => {
  const source = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return source.find(c => c.name === category) || source.find(c => c.name === 'Lainnya');
};

export const Transactions: React.FC = () => {
  const { transactions, accounts, addTransaction, deleteTransaction } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    account_id: '',
  });

  const filteredTx = useMemo(() => {
    let items = transactions;
    if (filter !== 'all') items = items.filter(t => t.type === filter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return items;
  }, [transactions, filter, searchTerm]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredTx> = {};
    filteredTx.forEach(tx => {
      const key = tx.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTx]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount) return;

    await addTransaction({
      type: form.type,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      account_id: form.account_id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || uuidv4(),
    });

    setForm({ type: 'expense', category: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), account_id: '' });
    setShowAdd(false);
  };

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Transaksi</h2>
          <p className="text-sm text-zinc-500">{transactions.length} total transaksi</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> Tambah
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
          {[
            { key: 'all' as const, label: 'Semua' },
            { key: 'income' as const, label: 'Masuk' },
            { key: 'expense' as const, label: 'Keluar' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <FilterIcon size={12} className="inline mr-1" /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-4">
        {grouped.map(([date, txs]) => (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
              </p>
              <p className="text-xs text-zinc-400">
                {txs.length} transaksi
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {txs.map(tx => {
                const cat = getCategoryMeta(tx.type, tx.category);
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <IconBubble name={cat?.icon} color={cat?.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{tx.description || tx.category}</p>
                      <p className="text-xs text-zinc-500">{tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} - {tx.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 transition-all"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm">Belum ada transaksi</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Transaksi">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${form.type === t
                  ? t === 'expense' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Jumlah</label>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
              <span className="text-sm text-zinc-500">Rp</span>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="flex-1 bg-transparent text-lg font-semibold text-zinc-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Kategori {form.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</label>
              <span className="text-[11px] text-zinc-400">Kategori bawaan, tidak dapat diedit</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-colors border ${form.category === cat.name
                    ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <NotionIcon name={cat.icon} size={18} />
                  <span className="truncate w-full text-center">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Deskripsi</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Contoh: Makan siang di restoran"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Akun</label>
              <select
                value={form.account_id}
                onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Pilih akun</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Simpan Transaksi
          </button>
        </form>
      </Modal>
    </div>
  );
};
