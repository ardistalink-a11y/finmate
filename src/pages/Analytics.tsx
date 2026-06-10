import React, { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export const Analytics: React.FC = () => {
  const { transactions } = useStore();
  const [timeRange, setTimeRange] = useState(6);

  // Monthly income vs expense for last N months
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return isWithinInterval(td, { start, end });
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      data.push({
        month: format(d, 'MMM', { locale: idLocale }),
        income,
        expense,
        savings: income - expense,
      });
    }
    return data;
  }, [transactions, timeRange]);

  // Current month category breakdown
  const now = new Date();
  const currentMonthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
    }),
    [transactions, now]
  );

  const expenseByCat = useMemo(() => {
    const catMap: Record<string, number> = {};
    currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    return Object.entries(catMap)
      .map(([name, value]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.name === name);
        return { name, value, color: cat?.color || '#6b7280', icon: cat?.icon || 'other' };
      })
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTx]);

  const incomeByCat = useMemo(() => {
    const catMap: Record<string, number> = {};
    currentMonthTx.filter(t => t.type === 'income').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    return Object.entries(catMap)
      .map(([name, value]) => {
        const cat = INCOME_CATEGORIES.find(c => c.name === name);
        return { name, value, color: cat?.color || '#6b7280', icon: cat?.icon || 'other' };
      })
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTx]);

  // Savings rate
  const totalIncome = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.expense, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

  // Average daily spending
  const avgDailySpending = totalExpense / (timeRange * 30);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Analitik</h2>
          <p className="text-sm text-zinc-500">Insight keuangan Anda</p>
        </div>
        <div className="flex gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
          {[3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setTimeRange(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${timeRange === m
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {m} bulan
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Total Pemasukan</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Total Pengeluaran</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Savings Rate</p>
          <p className={`text-lg font-bold mt-1 ${savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {savingsRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500">Rata-rata Harian</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-white mt-1">{formatCurrency(avgDailySpending)}</p>
        </div>
      </div>

      {/* Income vs Expense chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Pemasukan vs Pengeluaran</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barGap={4}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
              formatter={(value) => [formatCurrency(Number(value))]}
            />
            <Legend />
            <Bar dataKey="income" name="Pemasukan" fill="#22c55e" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Savings trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Tren Tabungan</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
              formatter={(value) => [formatCurrency(Number(value))]}
            />
            <Line type="monotone" dataKey="savings" name="Tabungan" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Expense by category */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Pengeluaran per Kategori</h3>
          {expenseByCat.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseByCat} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {expenseByCat.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(value) => [formatCurrency(Number(value))]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {expenseByCat.map((cat, i) => {
                  const total = expenseByCat.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? (cat.value / total * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400">{pct.toFixed(1)}%</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">Belum ada data</div>
          )}
        </div>

        {/* Income by category */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Pemasukan per Kategori</h3>
          {incomeByCat.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomeByCat} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {incomeByCat.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(value) => [formatCurrency(Number(value))]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {incomeByCat.map((cat, i) => {
                  const total = incomeByCat.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? (cat.value / total * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400">{pct.toFixed(1)}%</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">Belum ada data</div>
          )}
        </div>
      </div>
    </div>
  );
};
