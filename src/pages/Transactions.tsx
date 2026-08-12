import React, { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, FilterIcon, EditIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Transaction } from '@/types';
import { IconBubble, NotionIcon } from '@/components/NotionIcon';
import * as storage from '@/lib/storage';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

const createEmptyForm = () => ({
  type: 'expense' as Transaction['type'],
  category: '',
  amount: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  account_id: '',
  to_account_id: '',
});

type TransactionForm = ReturnType<typeof createEmptyForm>;

const getCategoryMeta = (type: Transaction['type'], category: string) => {
  if (type === 'transfer') return undefined;
  const source = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return source.find((item) => item.name === category) || source.find((item) => item.name === 'Lainnya');
};

const getBalanceDeltas = (transaction: Transaction) => {
  const deltas: Record<string, number> = {};
  const addDelta = (accountId: string | undefined, amount: number) => {
    if (!accountId) return;
    deltas[accountId] = (deltas[accountId] || 0) + amount;
  };
  if (transaction.type === 'transfer') {
    addDelta(transaction.account_id, -transaction.amount);
    addDelta(transaction.to_account_id, transaction.amount);
  } else {
    addDelta(transaction.account_id, transaction.type === 'income' ? transaction.amount : -transaction.amount);
  }
  return deltas;
};

export const Transactions: React.FC = () => {
  const { transactions, accounts, addTransaction, updateTransaction, deleteTransaction, transactionCategoryFilter, setTransactionCategoryFilter } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<TransactionForm>(createEmptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTx = useMemo(() => {
    let items = transactions;
    if (filter !== 'all') items = items.filter((transaction) => transaction.type === filter);
    if (transactionCategoryFilter) items = items.filter((transaction) => transaction.category === transactionCategoryFilter);
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      items = items.filter((transaction) => transaction.description.toLowerCase().includes(query) || transaction.category.toLowerCase().includes(query));
    }
    return items;
  }, [transactions, filter, transactionCategoryFilter, searchTerm]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredTx> = {};
    filteredTx.forEach((transaction) => {
      if (!groups[transaction.date]) groups[transaction.date] = [];
      groups[transaction.date].push(transaction);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTx]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Masukkan jumlah yang lebih dari Rp0.');
      return;
    }

    const isTransfer = form.type === 'transfer';
    if (!isTransfer && !form.category) {
      setFormError('Pilih kategori transaksi terlebih dahulu.');
      return;
    }

    const accountId = isTransfer
      ? form.account_id
      : form.account_id || accounts.find((account) => account.type === 'cash')?.id || accounts[0]?.id || uuidv4();
    if (!accountId) {
      setFormError('Pilih akun terlebih dahulu.');
      return;
    }

    const oldTransaction = editId ? transactions.find((transaction) => transaction.id === editId) : undefined;
    if (isTransfer) {
      if (accounts.length < 2) {
        setFormError('Tambahkan minimal dua akun sebelum membuat transfer.');
        return;
      }
      if (!form.to_account_id) {
        setFormError('Pilih akun tujuan transfer.');
        return;
      }
      if (accountId === form.to_account_id) {
        setFormError('Akun asal dan akun tujuan harus berbeda.');
        return;
      }
      const sourceAccount = accounts.find((account) => account.id === accountId);
      if (!sourceAccount) {
        setFormError('Akun asal tidak ditemukan.');
        return;
      }
      const oldDeltas = oldTransaction ? getBalanceDeltas(oldTransaction) : {};
      const availableAfterRevert = sourceAccount.balance - (oldDeltas[accountId] || 0);
      if (availableAfterRevert < amount) {
        setFormError(`Saldo ${sourceAccount.name} tidak mencukupi untuk transfer sebesar ${formatCurrency(amount)}.`);
        return;
      }
    }

    const userId = useStore.getState().userId ?? '';
    const category = isTransfer ? 'Transfer' : form.category;

    if (!oldTransaction) {
      await addTransaction({
        type: form.type,
        category,
        amount,
        description: form.description,
        date: form.date,
        account_id: accountId,
        to_account_id: isTransfer ? form.to_account_id : undefined,
      });
      resetForm();
      setShowAdd(false);
      return;
    }

    const updatedTransaction: Transaction = {
      ...oldTransaction,
      type: form.type,
      category,
      amount,
      description: form.description,
      date: form.date,
      account_id: accountId,
      to_account_id: isTransfer ? form.to_account_id : undefined,
    };
    await updateTransaction(updatedTransaction);

    const oldDeltas = getBalanceDeltas(oldTransaction);
    const newDeltas = getBalanceDeltas(updatedTransaction);
    const balanceDeltas: Record<string, number> = {};
    Object.entries(oldDeltas).forEach(([id, delta]) => { balanceDeltas[id] = (balanceDeltas[id] || 0) - delta; });
    Object.entries(newDeltas).forEach(([id, delta]) => { balanceDeltas[id] = (balanceDeltas[id] || 0) + delta; });
    const currentAccounts = useStore.getState().accounts;
    const updatedAccounts = currentAccounts.map((account) => {
      const delta = balanceDeltas[account.id] || 0;
      return delta === 0 ? account : { ...account, balance: account.balance + delta };
    });
    const changedAccounts = updatedAccounts.filter((account, index) => account !== currentAccounts[index]);
    await Promise.all(changedAccounts.map((account) => storage.updateAccount(account, userId)));
    if (changedAccounts.length > 0) useStore.setState({ accounts: updatedAccounts });

    const currentBudgets = useStore.getState().budgets;
    if (oldTransaction.type === 'expense' && oldTransaction.category !== category) {
      const oldBudget = currentBudgets.find((budget) => budget.category === oldTransaction.category);
      if (oldBudget) {
        const updatedBudget = { ...oldBudget, spent: Math.max(0, oldBudget.spent - oldTransaction.amount) };
        await storage.updateBudget(updatedBudget, userId);
        useStore.setState({ budgets: useStore.getState().budgets.map((budget) => budget.id === updatedBudget.id ? updatedBudget : budget) });
      }
    }
    if (updatedTransaction.type === 'expense') {
      const newBudget = useStore.getState().budgets.find((budget) => budget.category === category);
      if (newBudget) {
        const delta = oldTransaction.type === 'expense' && oldTransaction.category === category ? amount - oldTransaction.amount : amount;
        const updatedBudget = { ...newBudget, spent: Math.max(0, newBudget.spent + delta) };
        await storage.updateBudget(updatedBudget, userId);
        useStore.setState({ budgets: useStore.getState().budgets.map((budget) => budget.id === updatedBudget.id ? updatedBudget : budget) });
      }
    }

    resetForm();
    setShowAdd(false);
    setEditId(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditId(transaction.id);
    setForm({
      type: transaction.type,
      category: transaction.category,
      amount: String(transaction.amount),
      description: transaction.description,
      date: transaction.date,
      account_id: transaction.account_id || '',
      to_account_id: transaction.to_account_id || '',
    });
    setFormError(null);
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setShowConfirm(null);
  };

  const cancelEdit = () => {
    setShowAdd(false);
    setEditId(null);
    resetForm();
  };

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Transaksi</h2>
          <p className="text-sm text-zinc-500">{transactions.length} total transaksi</p>
        </div>
        <button
          onClick={() => { setEditId(null); resetForm(); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} /> Tambah
        </button>
      </div>

      {transactionCategoryFilter && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <p className="min-w-0 truncate text-emerald-800 dark:text-emerald-300">Menampilkan kategori: <span className="font-semibold">{transactionCategoryFilter}</span></p>
          <button
            type="button"
            onClick={() => setTransactionCategoryFilter(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
          >
            Tampilkan semua
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        <div className="grid grid-cols-4 gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
          {[
            { key: 'all' as const, label: 'Semua' },
            { key: 'income' as const, label: 'Masuk' },
            { key: 'expense' as const, label: 'Keluar' },
            { key: 'transfer' as const, label: 'Transfer' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filter === item.key ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <FilterIcon size={12} className="inline mr-1" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(([date, transactionList]) => (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                {format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
              </p>
              <p className="text-xs text-zinc-400">{transactionList.length} transaksi</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactionList.map((transaction) => {
                const isTransfer = transaction.type === 'transfer';
                const category = getCategoryMeta(transaction.type, transaction.category);
                const sourceAccount = accounts.find((account) => account.id === transaction.account_id);
                const destinationAccount = accounts.find((account) => account.id === transaction.to_account_id);
                return (
                  <div key={transaction.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    {isTransfer ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-base font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" aria-hidden="true">⇄</div>
                    ) : (
                      <IconBubble name={category?.icon} color={category?.color} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {transaction.description || (isTransfer ? 'Transfer antar akun' : transaction.category)}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {isTransfer
                          ? `Transfer: ${sourceAccount?.name || 'Akun asal'} → ${destinationAccount?.name || 'Akun tujuan'}`
                          : `${transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} - ${transaction.category}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isTransfer ? 'text-blue-600 dark:text-blue-400' : transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isTransfer ? formatCurrency(transaction.amount) : `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => handleEdit(transaction)} className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors" title="Edit" aria-label="Edit transaksi">
                        <EditIcon size={16} />
                      </button>
                      <button onClick={() => setShowConfirm(transaction.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors" title="Hapus" aria-label="Hapus transaksi">
                        <TrashIcon size={16} />
                      </button>
                    </div>
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

      <Modal open={showAdd} onClose={cancelEdit} title={editId ? (form.type === 'transfer' ? 'Edit Transfer' : 'Edit Transaksi') : 'Tambah Transaksi'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['expense', 'income', 'transfer'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    type,
                    category: type === 'transfer' ? 'Transfer' : '',
                    to_account_id: type === 'transfer' ? current.to_account_id : '',
                  }));
                  setFormError(null);
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${form.type === type
                  ? type === 'expense'
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                    : type === 'income'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {type === 'expense' ? 'Pengeluaran' : type === 'income' ? 'Pemasukan' : 'Transfer'}
              </button>
            ))}
          </div>

          {formError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {formError}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Jumlah</label>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
              <span className="text-sm text-zinc-500">Rp</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0"
                className="flex-1 bg-transparent text-lg font-semibold text-zinc-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>
          {form.type === 'transfer' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Dari akun</label>
                <select
                  value={form.account_id}
                  onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                >
                  <option value="">Pilih akun asal</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} — {formatCurrency(account.balance)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Ke akun</label>
                <select
                  value={form.to_account_id}
                  onChange={(event) => setForm((current) => ({ ...current, to_account_id: event.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                >
                  <option value="">Pilih akun tujuan</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.id === form.account_id}>{account.name} — {formatCurrency(account.balance)}</option>
                  ))}
                </select>
              </div>
              {accounts.length < 2 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 sm:col-span-2">Tambahkan satu akun lagi dari halaman Dompet untuk memakai transfer.</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Kategori {form.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</label>
                <span className="text-[11px] text-zinc-400">Kategori bawaan, tidak dapat diedit</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, category: category.name }))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-colors border ${form.category === category.name
                      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <NotionIcon name={category.icon} size={18} />
                    <span className="truncate w-full text-center">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Deskripsi</label>
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={form.type === 'transfer' ? 'Contoh: Isi saldo e-wallet' : 'Contoh: Makan siang di restoran'}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {form.type !== 'transfer' && accounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Akun</label>
              <select
                value={form.account_id}
                onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">Pilih akun</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700">
              Batal
            </button>
            <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
              {editId ? 'Simpan Perubahan' : form.type === 'transfer' ? 'Simpan Transfer' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!showConfirm} onClose={() => setShowConfirm(null)} title="Hapus Transaksi">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Apakah kamu yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan dan saldo akun akan dikembalikan.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(null)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700">
              Batal
            </button>
            <button onClick={() => showConfirm && handleDelete(showConfirm)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
