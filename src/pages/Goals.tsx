import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { PlusIcon, TrashIcon, EditIcon } from '@/components/Icons';
import { Modal } from '@/components/Modal';
import { IconBubble, NotionIcon } from '@/components/NotionIcon';
import { differenceInDays } from 'date-fns';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
const GOAL_ICONS = ['target', 'goal-home', 'goal-car', 'goal-plane', 'goal-phone', 'goal-education', 'goal-fund', 'goal-health', 'savings', 'investment'];
const COLORS = ['#10b981', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#ef4444', '#eab308'];

export const Goals: React.FC = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAddMoney, setShowAddMoney] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    icon: 'target',
    color: '#10b981',
  });

  const handleOpen = (goalId?: string) => {
    if (goalId) {
      const g = goals.find(x => x.id === goalId);
      if (g) {
        setForm({
          name: g.name,
          target_amount: g.target_amount.toString(),
          current_amount: g.current_amount.toString(),
          deadline: g.deadline,
          icon: g.icon,
          color: g.color,
        });
        setEditId(goalId);
      }
    } else {
      setForm({ name: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#10b981' });
      setEditId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.target_amount) return;
    if (editId) {
      const existing = goals.find(g => g.id === editId)!;
      await updateGoal({ ...existing, name: form.name, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) || 0, deadline: form.deadline, icon: form.icon, color: form.color });
    } else {
      await addGoal({ name: form.name, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) || 0, deadline: form.deadline, icon: form.icon, color: form.color });
    }
    setShowModal(false);
  };

  const handleAddMoney = async (goalId: string) => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (goal) { await updateGoal({ ...goal, current_amount: goal.current_amount + amount }); }
    setAddAmount('');
    setShowAddMoney(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Financial Goals</h2>
          <p className="text-sm text-zinc-500">{goals.length} goal aktif</p>
        </div>
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
          <PlusIcon size={16} /> Tambah Goal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map(g => {
          const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
          const remaining = g.target_amount - g.current_amount;
          const daysLeft = g.deadline ? differenceInDays(new Date(g.deadline), new Date()) : null;
          const dailySaving = daysLeft && daysLeft > 0 && remaining > 0 ? remaining / daysLeft : 0;
          return (
            <div key={g.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <IconBubble name={g.icon} color={g.color} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{g.name}</p>
                    {daysLeft !== null && (
                      <p className={`text-xs ${daysLeft < 0 ? 'text-red-500' : daysLeft < 30 ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {daysLeft < 0 ? 'Sudah lewat' : `${daysLeft} hari lagi`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpen(g.id)} className="p-1.5 text-zinc-400 hover:text-emerald-500 transition-colors"><EditIcon size={14} /></button>
                  <button onClick={() => deleteGoal(g.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"><TrashIcon size={14} /></button>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xl font-bold" style={{ color: g.color }}>{formatCurrency(g.current_amount)}</span>
                <span className="text-sm text-zinc-500">/ {formatCurrency(g.target_amount)}</span>
              </div>
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: g.color }} />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{pct.toFixed(1)}% tercapai</span>
                {dailySaving > 0 && <span>~{formatCurrency(dailySaving)}/hari</span>}
              </div>
              {showAddMoney === g.id ? (
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-zinc-400">Rp</span>
                    <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full" autoFocus />
                  </div>
                  <button onClick={() => handleAddMoney(g.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors">Tambah</button>
                </div>
              ) : (
                <button onClick={() => setShowAddMoney(g.id)} className="mt-3 w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-500 hover:text-emerald-600 hover:border-emerald-400 dark:hover:text-emerald-400 dark:hover:border-emerald-500 transition-colors">+ Tambah Dana</button>
              )}
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400"><p className="text-sm">Belum ada goal</p></div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Goal' : 'Tambah Goal'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Nama Goal</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Dana darurat, Beli rumah" className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors border ${form.icon === icon ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                  <NotionIcon name={icon} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Target</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-xs text-zinc-500">Rp</span>
                <input type="number" value={form.target_amount} onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))} className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Sudah Terkumpul</label>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5">
                <span className="text-xs text-zinc-500">Rp</span>
                <input type="number" value={form.current_amount} onChange={(e) => setForm(f => ({ ...f, current_amount: e.target.value }))} className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white outline-none w-full" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Warna</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-zinc-900' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            {editId ? 'Simpan Perubahan' : 'Tambah Goal'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
