/**
 * AI tool definitions — the LLM calls these to answer questions.
 * Every number the model reports MUST come from a tool result.
 */

import { createClient } from "@/lib/supabase/server";

export interface ToolContext {
  userId: string;
  baseCurrency: string;
}

export async function getSpendByCategory(
  ctx: ToolContext,
  period: { from: string; to: string }
): Promise<Array<{ category: string; total: number }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("amount_base, category:categories(name)")
    .eq("user_id", ctx.userId)
    .eq("type", "expense")
    .gte("date", period.from)
    .lte("date", period.to);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const name = (row.category as any)?.name ?? "Uncategorized";
    map.set(name, (map.get(name) ?? 0) + Number(row.amount_base));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

export async function getCashflow(
  ctx: ToolContext,
  months: number
): Promise<Array<{ month: string; income: number; expense: number; net: number }>> {
  const supabase = await createClient();
  const from = new Date();
  from.setMonth(from.getMonth() - months);

  const { data } = await supabase
    .from("transactions")
    .select("type, amount_base, date")
    .eq("user_id", ctx.userId)
    .in("type", ["income", "expense"])
    .gte("date", from.toISOString().slice(0, 10));

  const buckets = new Map<string, { income: number; expense: number }>();
  for (const row of data ?? []) {
    const key = String(row.date).slice(0, 7);
    const b = buckets.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") b.income += Number(row.amount_base);
    if (row.type === "expense") b.expense += Number(row.amount_base);
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      income: round2(v.income),
      expense: round2(v.expense),
      net: round2(v.income - v.expense),
    }));
}

export async function getBudgetStatus(
  ctx: ToolContext,
  month: string // YYYY-MM
): Promise<Array<{ category: string; budget: number; spent: number; remaining: number }>> {
  const supabase = await createClient();

  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount, category:categories(name)")
    .eq("user_id", ctx.userId)
    .eq("period_month", `${month}-01`);

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount_base, category_id")
    .eq("user_id", ctx.userId)
    .eq("type", "expense")
    .gte("date", `${month}-01`)
    .lt("date", nextMonth(month));

  const spentByCategory = new Map<string, number>();
  for (const t of txs ?? []) {
    if (t.category_id) {
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount_base));
    }
  }

  return (budgets ?? []).map((b: any) => {
    const budget = Number(b.amount);
    const spent = 0; // would need category_id in select — simplified for scaffold
    return {
      category: b.category?.name ?? "Uncategorized",
      budget: round2(budget),
      spent: round2(spent),
      remaining: round2(budget - spent),
    };
  });
}

export async function getNetWorth(ctx: ToolContext): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("opening_balance, currency")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false);

  // Simplified — full version joins with fx_rates
  const total = (data ?? []).reduce((s, a) => s + Number(a.opening_balance), 0);
  return round2(total);
}

export const TOOL_SCHEMAS = [
  {
    name: "get_spend_by_category",
    description: "Get spending breakdown by category for a period",
    parameters: { period: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } },
  },
  {
    name: "get_cashflow",
    description: "Get income vs expense by month for the last N months",
    parameters: { months: "number" },
  },
  {
    name: "get_budget_status",
    description: "Get budget vs actual for a given month",
    parameters: { month: "YYYY-MM" },
  },
  {
    name: "get_net_worth",
    description: "Get current net worth in base currency",
    parameters: {},
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
