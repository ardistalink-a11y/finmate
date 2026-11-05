import { createClient } from "@/lib/supabase/server";

export interface ToolContext {
  userId: string;
  baseCurrency: string;
}

export async function getSpendByCategory(ctx: ToolContext, period: { from: string; to: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("transactions")
    .select("amount_base, category:categories(name)")
    .eq("user_id", ctx.userId).eq("type", "expense")
    .gte("date", period.from).lte("date", period.to);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const name = (row.category as any)?.name ?? "Uncategorized";
    map.set(name, (map.get(name) ?? 0) + Math.abs(Number(row.amount_base)));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

export async function getCashflow(ctx: ToolContext, months: number) {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - Math.max(1, Math.min(months, 60)));
  const { data } = await supabase.from("transactions")
    .select("type, amount_base, date")
    .eq("user_id", ctx.userId).in("type", ["income", "expense"])
    .gte("date", from.toISOString().slice(0, 10));

  const buckets = new Map<string, { income: number; expense: number }>();
  for (const row of data ?? []) {
    const key = String(row.date).slice(0, 7);
    const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") bucket.income += Number(row.amount_base);
    if (row.type === "expense") bucket.expense += Math.abs(Number(row.amount_base));
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month, income: round2(value.income), expense: round2(value.expense),
      net: round2(value.income - value.expense),
    }));
}

export async function getBudgetStatus(ctx: ToolContext, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const supabase = await createClient();
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const monthStart = `${month}-01`;
  const monthEnd = new Date(Date.parse(`${nextMonthDate}T00:00:00.000Z`) - 86_400_000)
    .toISOString().slice(0, 10);

  const [{ data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from("budgets")
      .select("amount,currency,category_id,start_date,end_date,category:categories(name)")
      .eq("user_id", ctx.userId).eq("is_active", true).eq("period", "monthly")
      .lte("start_date", monthEnd).or(`end_date.is.null,end_date.gte.${monthStart}`),
    supabase.from("transactions").select("amount_base,category_id")
      .eq("user_id", ctx.userId).eq("type", "expense")
      .gte("date", monthStart).lt("date", nextMonthDate),
  ]);

  const spentByCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const transaction of transactions ?? []) {
    const amount = Math.abs(Number(transaction.amount_base));
    totalSpent += amount;
    if (transaction.category_id) {
      spentByCategory.set(transaction.category_id, (spentByCategory.get(transaction.category_id) ?? 0) + amount);
    }
  }

  const result = [];
  for (const item of budgets ?? []) {
    let rate = 1;
    if (item.currency !== ctx.baseCurrency) {
      const { data: fx } = await supabase.from("fx_rates").select("rate")
        .eq("base", item.currency).eq("quote", ctx.baseCurrency)
        .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      if (!fx) continue;
      rate = Number(fx.rate);
    }
    const budget = Number(item.amount) * rate;
    const spent = item.category_id ? spentByCategory.get(item.category_id) ?? 0 : totalSpent;
    result.push({
      category: (item.category as any)?.name ?? "All categories",
      budget: round2(budget), spent: round2(spent), remaining: round2(budget - spent),
    });
  }
  return result;
}

export async function getNetWorth(ctx: ToolContext): Promise<number> {
  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("id,opening_balance,currency")
      .eq("user_id", ctx.userId).eq("is_archived", false),
    supabase.from("transactions").select("account_id,type,amount_base").eq("user_id", ctx.userId),
  ]);

  let total = 0;
  for (const account of accounts ?? []) {
    let rate = 1;
    if (account.currency !== ctx.baseCurrency) {
      const { data: fx } = await supabase.from("fx_rates").select("rate")
        .eq("base", account.currency).eq("quote", ctx.baseCurrency)
        .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      if (!fx) throw new Error(`Missing FX rate for ${account.currency} to ${ctx.baseCurrency}`);
      rate = Number(fx.rate);
    }
    total += Number(account.opening_balance) * rate;
  }
  const activeAccountIds = new Set((accounts ?? []).map((account) => account.id));
  for (const transaction of transactions ?? []) {
    if (activeAccountIds.has(transaction.account_id)) {
      total += Number(transaction.amount_base);
    }
  }
  return round2(total);
}

export const TOOL_SCHEMAS = [
  { name: "get_spend_by_category", description: "Get spending breakdown by category for a period", parameters: { period: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } } },
  { name: "get_cashflow", description: "Get income vs expense by month for the last N months", parameters: { months: "number" } },
  { name: "get_budget_status", description: "Get budget vs actual for a given month", parameters: { month: "YYYY-MM" } },
  { name: "get_net_worth", description: "Get current net worth in base currency", parameters: {} },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}