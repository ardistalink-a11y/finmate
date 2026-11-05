import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { cashflow, byCategory } from "@/lib/finance/aggregates";
import { Card } from "@/components/ui";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("is_archived", false),
    supabase.from("categories").select("*"),
  ]);
  const txs = await fetchAllUserTransactions(supabase, user.id);

  const baseCurrency = profile?.base_currency ?? "IDR";
  const name = profile?.full_name?.split(" ")[0] ?? "there";

  // Keep balances grouped by currency because opening balances have no FX snapshot.
  const netWorthByCurrency = new Map<string, number>();
  const activeAccountIds = new Set((accounts ?? []).map((account) => account.id));
  for (const account of accounts ?? []) {
    netWorthByCurrency.set(
      account.currency,
      (netWorthByCurrency.get(account.currency) ?? 0) + Number(account.opening_balance)
    );
  }
  for (const transaction of txs) {
    if (transaction.type === "transfer" || !activeAccountIds.has(transaction.account_id)) continue;
    netWorthByCurrency.set(
      transaction.currency,
      (netWorthByCurrency.get(transaction.currency) ?? 0) + Number(transaction.amount)
    );
  }

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonth = (txs ?? []).filter((x) => x.date.startsWith(monthPrefix));
  const cf = cashflow(
    thisMonth
      .filter((x) => x.type !== "transfer")
      .map((x) => ({
        type: x.type as "income" | "expense",
        amount_base: Number(x.amount_base),
        category_id: x.category_id,
        date: x.date,
      }))
  );

  const topCategories = byCategory(
    thisMonth
      .filter((x) => x.type !== "transfer")
      .map((x) => ({
        type: x.type as "income" | "expense",
        amount_base: Number(x.amount_base),
        category_id: x.category_id,
        date: x.date,
      })),
    "expense"
  ).slice(0, 5);

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const accMap = new Map((accounts ?? []).map((a) => [a.id, a.name]));

  const noAccounts = !accounts || accounts.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("greeting", { name })}</h1>
        <p className="text-sm text-muted">Finmate · {new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}</p>
      </div>

      {noAccounts && (
        <Card className="border-dashed">
          <div className="py-6 text-center">
            <h2 className="text-base font-medium">{t("noAccounts")}</h2>
            <p className="mb-4 mt-1 text-sm text-muted">Start by adding your first wallet.</p>
            <Link
              href={`/${locale}/accounts`}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
            >
              <Plus className="h-4 w-4" />
              {t("addFirstAccount")}
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-medium text-muted">
            {locale === "id" ? "Saldo bersih per mata uang" : "Net worth by currency"}
          </div>
          <div className="mt-2 space-y-1">
            {netWorthByCurrency.size === 0 ? (
              <div className="num text-2xl font-semibold">{formatMoney(0, baseCurrency, locale)}</div>
            ) : (
              Array.from(netWorthByCurrency.entries())
                .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
                .map(([currency, amount]) => (
                  <div key={currency} className="num text-lg font-semibold">
                    {formatMoney(amount, currency, locale)}
                  </div>
                ))
            )}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium text-muted">{t("income")} · {t("cashflowThisMonth")}</div>
          <div className="mt-2 num text-2xl font-semibold text-income">
            {formatMoney(cf.income, baseCurrency, locale)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-medium text-muted">{t("expense")} · {t("cashflowThisMonth")}</div>
          <div className="mt-2 num text-2xl font-semibold text-expense">
            {formatMoney(cf.expense, baseCurrency, locale)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">{t("recentTransactions")}</h2>
            <Link href={`/${locale}/transactions`} className="flex items-center gap-1 text-xs text-accent hover:underline">
              {t("viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(txs ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t("noTransactions")}</p>
          ) : (
            <ul className="divide-y">
              {(txs ?? []).slice(0, 6).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      {tx.note || catMap.get(tx.category_id) || tx.merchant || tx.type}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(tx.date).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" })}
                      {accMap.get(tx.account_id) && ` · ${accMap.get(tx.account_id)}`}
                    </div>
                  </div>
                  <div className={`num text-sm font-medium ${tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-muted"}`}>
                    {formatMoney(Number(tx.amount), tx.currency, locale, { signed: true })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium">{t("topCategories")}</h2>
          {topCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t("noTransactions")}</p>
          ) : (
            <ul className="space-y-3">
              {topCategories.map((c) => (
                <li key={c.category_id ?? "none"}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{catMap.get(c.category_id ?? "") ?? "Uncategorized"}</span>
                    <span className="num text-xs text-muted">{formatMoney(c.total, baseCurrency, locale)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-expense/60"
                      style={{ width: `${Math.min(100, (c.total / (topCategories[0]?.total || 1)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
