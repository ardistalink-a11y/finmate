import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input, Label } from "@/components/ui";
import { createBudget, updateBudget, deleteBudget } from "@/server/actions/planning";

export default async function BudgetsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("budgets");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: budgets } = await s.from("budgets").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  const periodLabel = (period: string) => t(period as "weekly" | "monthly" | "yearly");

  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-1 text-sm text-muted">{t("subtitle")}</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="space-y-3">
        {(budgets ?? []).length === 0 ? <p className="py-10 text-center text-sm text-muted">{t("empty")}</p> : budgets!.map((b) => {
          const amount = Number(b.amount);
          const progress = Math.min(100, Math.max(0, Number(b.spent ?? 0) / Math.max(amount, 1) * 100));
          return <details key={b.id} className="group rounded-xl border bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div><p className="font-medium">{b.name}</p><p className="mt-1 text-xs text-muted">{periodLabel(b.period)} · {b.currency}</p></div>
              <div className="text-right"><p className="num font-semibold">{formatMoney(amount, b.currency, locale)}</p></div>
            </summary>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: progress + "%" }} /></div>
            <form action={updateBudget} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={b.id} />
              <div><Label htmlFor={"budget-name-" + b.id}>{t("name")}</Label><Input id={"budget-name-" + b.id} name="name" defaultValue={b.name} required /></div>
              <div><Label htmlFor={"budget-amount-" + b.id}>{t("amount")}</Label><Input id={"budget-amount-" + b.id} name="amount" type="number" min="0" step="0.01" defaultValue={amount} required /></div>
              <div><Label htmlFor={"budget-period-" + b.id}>{t("period")}</Label><select id={"budget-period-" + b.id} name="period" className="input" defaultValue={b.period}><option value="weekly">{t("weekly")}</option><option value="monthly">{t("monthly")}</option><option value="yearly">{t("yearly")}</option></select></div>
              <div className="flex items-end"><Button type="submit" size="sm">{t("save")}</Button></div>
            </form>
            <form action={deleteBudget} className="mt-3"><input type="hidden" name="id" value={b.id} /><Button type="submit" variant="ghost" size="sm" className="text-expense">{t("delete")}</Button></form>
          </details>;
        })}
      </Card>
      <Card className="h-fit">
        <h2 className="text-base font-semibold">{t("add")}</h2>
        <form action={createBudget} className="mt-4 space-y-4">
          <div><Label htmlFor="budget-new-name">{t("name")}</Label><Input id="budget-new-name" name="name" required maxLength={100} /></div>
          <div><Label htmlFor="budget-new-amount">{t("amount")}</Label><Input id="budget-new-amount" name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div><Label htmlFor="budget-new-currency">{t("currency")}</Label><select id="budget-new-currency" name="currency" className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option><option>MYR</option></select></div>
          <div><Label htmlFor="budget-new-period">{t("period")}</Label><select id="budget-new-period" name="period" className="input"><option value="monthly">{t("monthly")}</option><option value="weekly">{t("weekly")}</option><option value="yearly">{t("yearly")}</option></select></div>
          <Button type="submit" className="w-full">{t("add")}</Button>
        </form>
      </Card>
    </div>
  </div>;
}
