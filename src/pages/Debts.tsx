import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, CheckIcon, EditIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { IconBubble } from '@/components/NotionIcon';
import { format, differenceInDays } from 'date-fns';
import { getTranslation, formatCurrency } from '@/lib/i18n';

export const Debts: React.FC = () => {
  const { debts, accounts, addDebt, addToDebt, payDebt, deleteDebt, updateDebt, language } = useStore();
  const t = getTranslation(language);

  const [showModal, setShowModal]   = useState(false);
  const [filter, setFilter]         = useState<'all' | 'debt' | 'receivable'>('all');
  const [payingDebt, setPayingDebt] = useState<typeof debts[0] | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [mergeInfo, setMergeInfo]   = useState<{ existing: typeof debts[0]; newAmount: number; desc: string; due: string } | null>(null);
  const [editId, setEditId]         = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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
  const totalDebt        = debts.filter(d => d.type === 'debt'       && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const totalReceivable  = debts.filter(d => d.type === 'receivable' && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const netPosition      = totalReceivable - totalDebt;

  const resetForm = () => setForm({ type: 'debt', person_name: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), due_date: '', account_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.person_name || !form.amount) return;
    const newAmount = parseFloat(form.amount);

    if (editId) {
      // Edit existing debt
      const oldDebt = debts.find(d => d.id === editId);
      if (!oldDebt) return;

      const oldAmount = oldDebt.amount;
      const oldType = oldDebt.type;
      const oldAccountId = oldDebt.account_id;

      const updated: typeof oldDebt = {
        ...oldDebt,
        type: form.type,
        person_name: form.person_name,
        amount: newAmount,
        description: form.description,
        date: form.date,
        due_date: form.due_date || undefined,
        account_id: form.account_id || oldAccountId,
      };

      await updateDebt(updated);

      // Revert old balance effect
      if (oldAccountId) {
        const oldAccount = accounts.find(a => a.id === oldAccountId);
        if (oldAccount) {
          const revertDelta = oldType === 'debt' ? -oldAmount : oldAmount;
          const updatedAcc = { ...oldAccount, balance: oldAccount.balance + revertDelta };
          const { storage } = await import('@/lib/storage');
          await storage.updateAccount(updatedAcc, useStore.getState().userId ?? '');
          useStore.setState(s => ({ accounts: s.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a) }));
        }
      }

      // Apply new balance effect
      const uid = useStore.getState().userId ?? '';
      const { storage } = await import('@/lib/storage');
      if (updated.account_id) {
        const newAccount = useStore.getState().accounts.find(a => a.id === updated.account_id);
        if (newAccount) {
          const delta = form.type === 'debt' ? newAmount : -newAmount;
          const updatedAcc = { ...newAccount, balance: newAccount.balance + delta };
          await storage.updateAccount(updatedAcc, uid);
          useStore.setState(s => ({ accounts: s.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a) }));
        }
      }

      setEditId(null);
    } else {
      // Add new debt
      const existing = debts.find(
        d => d.person_name.toLowerCase() === form.person_name.toLowerCase()
          && d.type === form.type
          && !d.is_paid
      );

      if (existing) {
        setMergeInfo({ existing, newAmount, desc: form.description, due: form.due_date });
        return;
      }

      await addDebt({
        type: form.type,
        person_name: form.person_name,
        amount: newAmount,
        description: form.description,
        date: form.date,
        due_date: form.due_date || undefined,
        account_id: form.account_id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '',
        is_paid: false,
      });
    }

    resetForm();
    setShowModal(false);
    setEditId(null);
  };

  const handleConfirmMerge = async () => {
    if (!mergeInfo) return;
    await addToDebt(mergeInfo.existing.id, mergeInfo.newAmount, mergeInfo.desc || undefined, mergeInfo.due || undefined);
    setMergeInfo(null);
    resetForm();
    setShowModal(false);
  };

  const handleAddNew = async () => {
    if (!mergeInfo) return;
    await addDebt({
      type: form.type,
      person_name: form.person_name,
      amount: mergeInfo.newAmount,
      description: mergeInfo.desc,
      date: form.date,
      due_date: mergeInfo.due || undefined,
      account_id: form.account_id || accounts.find(a => a.type === 'cash')?.id || accounts[0]?.id || '',
      is_paid: false,
    });
    setMergeInfo(null);
    resetForm();
    setShowModal(false);
  };

  const handlePayConfirm = async () => {
    if (!payingDebt || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    await payDebt(payingDebt.id, amount);
    setPayingDebt(null);
    setPayAmount('');
  };

  const handleEdit = (debt: typeof debts[0]) => {
    setEditId(debt.id);
    setForm({
      type: debt.type,
      person_name: debt.person_name,
      amount: String(debt.amount),
      description: debt.description,
      date: debt.date,
      due_date: debt.due_date || '',
      account_id: debt.account_id || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDebt(id);
    setShowDeleteConfirm(null);
  };

  const cancelEdit = () => {
    setShowModal(false);
    setEditId(null);
    resetForm();
    setMergeInfo(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.debts.title}</h2>
          <p className="text-sm text-zinc-500">{filteredDebts.length} {t.debts.activeItems}</p>
        </div>
        <button onClick={() => { setEditId(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
          <PlusIcon size={16} /> {t.debts.addDebt}
        </button>
      </div>

      {/* Summary */}
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

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">{t.debts.notAffectIncomeExpense}</p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 w-fit">
        {[{ key: 'all' as const, label: t.common.all }, { key: 'debt' as const, label: t.debts.debt }, { key: 'receivable' as const, label: t.debts.receivable }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f.key ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
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
            <div key={debt.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <IconBubble name={debt.type === 'debt' ? 'donation' : 'gift'} color={debt.type === 'debt' ? '#ef4444' : '#22c55e'} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{debt.person_name}</p>
                    <p className="text-xs text-zinc-500">{debt.type === 'debt' ? t.debts.debtDesc : t.debts.receivableDesc}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(debt)} className="p-1.5 text-zinc-400 hover:text-blue-500 transition-colors" title="Edit">
                    <EditIcon size={16} />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(debt.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors" title="Hapus">
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>

              <p className={`text-xl font-bold ${debt.type === 'debt' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(debt.amount, language)}
              </p>

              {debt.description && <p className="text-xs text-zinc-500 mt-2">{debt.description}</p>}

              {debt.due_date && (
                <p className={`text-xs mt-2 ${isOverdue ? 'text-red-500' : daysUntilDue !== null && daysUntilDue <= 7 ? 'text-amber-500' : 'text-zinc-400'}`}>
                  {t.debts.dueDate}: {format(new Date(debt.due_date), 'dd MMM yyyy')}
                  {daysUntilDue !== null && (
                    <span className="ml-1">({isOverdue ? t.common.overdue : `${daysUntilDue} ${t.common.daysLeft}`})</span>
                  )}
                </p>
              )}

              {/* Bayar button */}
              <button
                onClick={() => { setPayingDebt(debt); setPayAmount(String(debt.amount)); }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium transition-colors border border-emerald-200 dark:border-emerald-500/30">
                <CheckIcon size={13} />
                {language === 'id' ? 'Bayar / Cicil' : 'Pay / Partial'}
              </button>
            </div>
          );
        })}

        {filteredDebts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
            <p className="text-sm">{t.common.noData}</p>
          </div>
        )}
      </div>

      {/* Paid */}
      {paidDebts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{t.common.paid}</h3>
          <div className="space-y-2">
            {paidDebts.slice(0, 5).map(debt => (
              <div key={debt.id} className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <IconBubble name={debt.type === 'debt' ? 'donation' : 'gift'} color="#71717a" size="sm" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{debt.person_name}</span>
                </div>
                <span className="text-sm font-medium text-zinc-500">{formatCurrency(debt.amount, language)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      <Modal open={showModal} onClose={cancelEdit} title={editId ? (language === 'id' ? 'Edit Hutang/Piutang' : 'Edit Debt') : t.debts.addDebt}>
        {!mergeInfo ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {(['debt', 'receivable'] as const).map(type => (
                <button key={type} type="button" onClick={() => setForm(f => ({ ...f, type }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${form.type === type
                    ? type === 'debt' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {type === 'debt' ? t.debts.debt : t.debts.receivable}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.debts.personName}</label>
              <input type="text" value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.amount}</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-sm text-zinc-500">Rp</span>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.description}</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.common.date}</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.debts.dueDate}</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                {t.common.cancel || 'Batal'}
              </button>
              <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
                {editId ? (language === 'id' ? 'Simpan Perubahan' : 'Save Changes') : t.common.save}
              </button>
            </div>
          </form>
        ) : (
          /* Konfirmasi merge */
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                {language === 'id' ? '⚠️ Sudah ada data untuk' : '⚠️ Existing entry for'} {mergeInfo.existing.person_name}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {language === 'id' ? 'Saldo saat ini:' : 'Current balance:'} {formatCurrency(mergeInfo.existing.amount, language)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {language === 'id' ? 'Tambahan baru:' : 'New addition:'} {formatCurrency(mergeInfo.newAmount, language)}
              </p>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mt-2">
                {language === 'id' ? 'Total jika digabung:' : 'Total if merged:'} {formatCurrency(mergeInfo.existing.amount + mergeInfo.newAmount, language)}
              </p>
            </div>
            <button onClick={handleConfirmMerge}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
              {language === 'id' ? '➕ Tambahkan ke saldo yang ada' : '➕ Add to existing balance'}
            </button>
            <button onClick={handleAddNew}
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors">
              {language === 'id' ? '📄 Buat entri terpisah' : '📄 Create separate entry'}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Bayar */}
      <Modal open={!!payingDebt} onClose={() => { setPayingDebt(null); setPayAmount(''); }}
        title={language === 'id' ? 'Bayar Hutang/Piutang' : 'Record Payment'}>
        {payingDebt && (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{payingDebt.person_name}</p>
              <p className="text-xs text-zinc-500">{payingDebt.type === 'debt' ? t.debts.debtDesc : t.debts.receivableDesc}</p>
              <p className={`text-lg font-bold ${payingDebt.type === 'debt' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {formatCurrency(payingDebt.amount, language)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                {language === 'id' ? 'Jumlah yang dibayar' : 'Payment amount'}
              </label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-sm text-zinc-500">Rp</span>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} max={payingDebt.amount}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none" />
              </div>
              {parseFloat(payAmount) > 0 && parseFloat(payAmount) < payingDebt.amount && (
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'id' ? 'Sisa:' : 'Remaining:'} {formatCurrency(payingDebt.amount - parseFloat(payAmount), language)}
                </p>
              )}
              {parseFloat(payAmount) >= payingDebt.amount && (
                <p className="text-xs text-emerald-500 mt-1 font-medium">
                  ✅ {language === 'id' ? 'Akan lunas sepenuhnya' : 'Will be fully paid'}
                </p>
              )}
            </div>

            {/* Quick presets */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} onClick={() => setPayAmount(String(Math.round(payingDebt.amount * pct / 100)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors">
                  {pct}%
                </button>
              ))}
            </div>

            <button onClick={handlePayConfirm} disabled={!payAmount || parseFloat(payAmount) <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors">
              {language === 'id' ? 'Konfirmasi Pembayaran' : 'Confirm Payment'}
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title={language === 'id' ? 'Hapus Hutang/Piutang' : 'Delete Debt'}>
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {language === 'id' ? 'Apakah kamu yakin ingin menghapus hutang/piutang ini? Saldo akun akan dikembalikan.' : 'Are you sure you want to delete this debt? Account balance will be reverted.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              {t.common.cancel || 'Batal'}
            </button>
            <button
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {t.common.delete || 'Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
