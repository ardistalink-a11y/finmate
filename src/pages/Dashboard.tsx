import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { ArrowUpIcon, ArrowDownIcon, TrendUpIcon, WalletIcon } from '@/components/Icons';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { id as idLocale, enUS } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { IconBubble } from '@/components/NotionIcon';
import { getTranslation, formatCurrency } from '@/lib/i18n';

export const Dashboard: React.FC = () => {
  const { transactions, accounts, budgets, language } = useStore();
  const t = getTranslation(language);
  const dateLocale = language === 'id' ? idLocale : enUS;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    }),
    [transactions, monthStart, monthEnd]
  );

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);
  const monthlyIncome = useMemo(() => monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthlyTx]);
  const monthlyExpense = useMemo(() => monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthlyTx]);

  // Previous month comparison
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));
  const prevMonthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start: prevMonthStart, end: prevMonthEnd });
    }),
    [transactions, prevMonthStart, prevMonthEnd]
  );
  const prevExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseChange = prevExpense > 0 ? ((monthlyExpense - prevExpense) / prevExpense * 100) : 0;

  // Chart data - daily spending for current month
  const dailyData = useMemo(() => {
    const daysInMonth = monthEnd.getDate();
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(now.getFullYear(), now.getMonth(), d), 'yyyy-MM-dd');
      const dayExpense = monthlyTx.filter(t => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dayIncome = monthlyTx.filter(t => t.date === dateStr && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      data.push({ day: d, expense: dayExpense, income: dayIncome });
    }
    return data;
  }, [monthlyTx, monthEnd, now]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    monthlyTx.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    return Object.entries(catMap)
      .map(([name, value]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.name === name);
        return { name, value, color: cat?.color || '#6b7280', icon: cat?.icon || 'other' };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthlyTx]);

  const recentTx = transactions.slice(0, 5);

  const statCards = [
    { label: t.dashboard.totalBalance, value: formatCurrency(totalBalance, language), icon: WalletIcon, color: 'from-emerald-500 to-green-700', textColor: 'text-white' },
    { label: t.dashboard.income, value: formatCurrency(monthlyIncome, language), icon: ArrowUpIcon, color: 'from-emerald-500 to-green-600', textColor: 'text-white' },
    { label: t.dashboard.expense, value: formatCurrency(monthlyExpense, language), icon: ArrowDownIcon, color: 'from-rose-500 to-red-600', textColor: 'text-white' },
    { label: t.dashboard.netFlow, value: formatCurrency(monthlyIncome - monthlyExpense, language), icon: TrendUpIcon, color: monthlyIncome >= monthlyExpense ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-amber-600', textColor: 'text-white' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {now.getHours() < 12 ? t.dashboard.greeting.morning : now.getHours() < 17 ? t.dashboard.greeting.afternoon : t.dashboard.greeting.evening}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          {t.dashboard.summary} {format(now, 'MMMM yyyy', { locale: dateLocale })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-4 lg:p-5`}>
            <div className="absolute top-3 right-3 opacity-20">
              <card.icon size={40} className={card.textColor} />
            </div>
            <p className={`text-xs lg:text-sm ${card.textColor} opacity-80`}>{card.label}</p>
            <p className={`text-lg lg:text-xl font-bold ${card.textColor} mt-1`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Spending chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.dashboard.trend}</h3>
            {expenseChange !== 0 && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${expenseChange > 0 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                {expenseChange > 0 ? '↑' : '↓'} {Math.abs(expenseChange).toFixed(1)}% {t.dashboard.vsLastMonth}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                formatter={(value) => [formatCurrency(Number(value), language)]}
              />
              <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">{t.dashboard.categoryBreakdown}</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: 'none', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    formatter={(value) => [formatCurrency(Number(value), language)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categoryData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(cat.value, language)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-400 text-sm">
              {t.common.noData}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent transactions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">{t.dashboard.recentTransactions}</h3>
          {recentTx.length > 0 ? (
            <div className="space-y-3">
              {recentTx.map(tx => {
                const cats = tx.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                const cat = cats.find(c => c.name === tx.category) || cats.find(c => c.name === 'Lainnya');
                return (
                  <div key={tx.id} className="flex items-center gap-3">
                    <IconBubble name={cat?.icon} color={cat?.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{tx.description || tx.category}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(tx.date), 'dd MMM yyyy', { locale: dateLocale })}</p>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, language)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
              {t.common.noData}
            </div>
          )}
        </div>

        {/* Budget overview */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">{t.dashboard.budgetThisMonth}</h3>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 5).map(b => {
                const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                const isOver = b.spent > b.amount;
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{b.category}</span>
                      <span className="text-xs text-zinc-500">
                        {formatCurrency(b.spent, language)} / {formatCurrency(b.amount, language)}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
              {t.common.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
