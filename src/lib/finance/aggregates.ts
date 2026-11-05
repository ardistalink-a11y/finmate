/**
 * Aggregation helpers — pure, testable.
 */

export interface TxRow {
  type: "income" | "expense" | "transfer";
  amount_base: number;
  category_id: string | null;
  date: string; // YYYY-MM-DD
}

export interface CategoryAggregate {
  category_id: string | null;
  total: number;
  count: number;
}

export function sumByType(txs: TxRow[], type: TxRow["type"]): number {
  return round2(txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount_base, 0));
}

export function cashflow(txs: TxRow[]): { income: number; expense: number; net: number } {
  const income = sumByType(txs, "income");
  const expense = round2(Math.abs(sumByType(txs, "expense")));
  return { income, expense, net: round2(income - expense) };
}

export function byCategory(txs: TxRow[], type: "income" | "expense"): CategoryAggregate[] {
  const map = new Map<string | null, { total: number; count: number }>();

  for (const t of txs) {
    if (t.type !== type) continue;
    const current = map.get(t.category_id) ?? { total: 0, count: 0 };
    current.total += type === "expense" ? Math.abs(t.amount_base) : t.amount_base;
    current.count += 1;
    map.set(t.category_id, current);
  }

  return Array.from(map.entries())
    .map(([category_id, v]) => ({ category_id, total: round2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

export function monthlyTrend(
  txs: TxRow[],
  monthsBack: number = 12
): { month: string; income: number; expense: number; net: number }[] {
  const now = new Date();
  const buckets: Record<string, { income: number; expense: number }> = {};

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { income: 0, expense: 0 };
  }

  for (const t of txs) {
    const key = t.date.slice(0, 7);
    if (!buckets[key]) continue;
    if (t.type === "income") buckets[key].income += t.amount_base;
    if (t.type === "expense") buckets[key].expense += Math.abs(t.amount_base);
  }

  return Object.entries(buckets).map(([month, v]) => ({
    month,
    income: round2(v.income),
    expense: round2(v.expense),
    net: round2(v.income - v.expense),
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
