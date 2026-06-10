import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, EditIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { ACCOUNT_TYPES } from '@/types';
import { IconBubble, NotionIcon } from '@/components/NotionIcon';

const COLORS = ['#10b981', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#ef4444', '#eab308'];
const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export const Accounts: React.FC = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'bank' as string,
    balance: '',
    currency: 'IDR',
    icon: 'bank',
    color: '#10b981',
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleOpen = (accountId?: string) => {
    if (accountId) {
      const acc = accounts.find(a => a.id === accountId);
      if (acc) {
        setForm({
          name: acc.name,
          type: acc.type,
          balance: acc.balance.toString(),
          currency: acc.currency,
          icon: acc.icon,
          color: acc.color,
        });
        setEditId(accountId);
      }
    } else {
      setForm({ name: '', type: 'bank', balance: '', currency: 'IDR', icon: 'bank', color: '#10b981' });
      setEditId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editId) {
      const existing = accounts.find(a => a.id === editId)!;
      await updateAccount({
        ...existing,
        name: form.name,
        type: form.type as 'cash' | 'bank' | 'e-wallet' | 'credit-card' | 'investment' | 'savings',
        balance: parseFloat(form.balance) || 0,
        currency: form.currency,
        icon: form.icon,
        color: form.color,
      });
    } else {
      await addAccount({
        name: form.name,
        type: form.type as 'cash' | 'bank' | 'e-wallet' | 'credit-card' | 'investment' | 'savings',
        balance: parseFloat(form.balance) || 0,
        currency: form.currency,
        icon: form.icon,
        color: form.color,
      });
    }

    setShowModal(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Akun Keuangan</h2>
        <p className="text-sm text-zinc-500">Cash default selalu tersedia untuk transaksi cepat.</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> Tambah Akun
        </button>
      </div>

      {/* Total card */}
      <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80">Total Saldo Semua Akun</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-2">{accounts.length} akun aktif</p>
      </div>

      {/* Account list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const accType = ACCOUNT_TYPES.find(t => t.type === acc.type);
          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-start justify-between mb-4">
                <IconBubble name={acc.icon} color={acc.color} size="lg" />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpen(acc.id)} className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors">
                    <EditIcon size={14} />
                  </button>
                  <button onClick={() => deleteAccount(acc.id)} disabled={acc.type === 'cash'} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-zinc-400" title={acc.type === 'cash' ? 'Cash default tidak dapat dihapus' : 'Hapus akun'}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{accType?.name || acc.type}</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white mt-0.5">{acc.name}</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white mt-3" style={{ color: acc.color }}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400">
            <p className="text-sm">Belum ada akun</p>
            <button onClick={() => handleOpen()} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              + Tambah akun pertama
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Akun' : 'Tambah Akun'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Nama Akun</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: BCA, GoPay"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Tipe Akun</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.type, icon: t.icon }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-colors border ${form.type === t.type
                    ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <NotionIcon name={t.icon} size={18} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Saldo Awal</label>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
              <span className="text-sm text-zinc-500">Rp</span>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0"
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Warna</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {editId ? 'Simpan Perubahan' : 'Tambah Akun'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
