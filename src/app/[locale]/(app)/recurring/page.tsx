import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input, Label } from "@/components/ui";
import { createRecurring, updateRecurring, deleteRecurring } from "@/server/actions/planning";

export default async function RecurringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("recurring");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const [{ data: recurring }, { data: accounts }, { data: categories }] = await Promise.all([
    s.from("recurring_transactions").select("*").eq("user_id", user!.id).order("next_run"),
    s.from("accounts").select("id,name").eq("user_id", user!.id).eq("is_archived", false),
    s.from("categories").select("id,name").or(`user_id.eq.${user!.id},user_id.is.null`).order("name"),
  ]);
  const labelFrequency = (frequency: string) => t(frequency as "weekly" | "monthly" | "yearly");
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-1 text-sm text-muted">{t("subtitle")}</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">{(recurring ?? []).length === 0 ? <Card><p className="py-10 text-center text-sm text-muted">{t("empty")}</p></Card> : recurring!.map((r) => <Card key={r.id}>
        <details>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4"><div><h2 className="font-medium">{r.note || t(r.type as "income" | "expense")}</h2><p className="mt-1 text-xs text-muted">{t(r.type as "income" | "expense")} · {labelFrequency(r.frequency)} · {t("nextRun")}: {r.next_run}</p></div><p className={`num whitespace-nowrap text-lg font-semibold ${r.type === "income" ? "text-income" : "text-expense"}`}>{formatMoney(Number(r.amount), r.currency || "IDR", locale)}</p></summary>
          <form action={updateRecurring} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={r.id} />
            <div><Label htmlFor={"recurring-amount-" + r.id}>{t("amount")}</Label><Input id={"recurring-amount-" + r.id} name="amount" type="number" min="0.01" step="0.01" defaultValue={r.amount} required /></div>
            <div><Label htmlFor={"recurring-note-" + r.id}>{t("note")}</Label><Input id={"recurring-note-" + r.id} name="note" defaultValue={r.note ?? ""} /></div>
            <div><Label htmlFor={"recurring-next-" + r.id}>{t("nextRun")}</Label><Input id={"recurring-next-" + r.id} name="next_run" type="date" defaultValue={r.next_run} required /></div>
            <div><Label htmlFor={"recurring-frequency-" + r.id}>{t("frequency")}</Label><select id={"recurring-frequency-" + r.id} name="frequency" className="input" defaultValue={r.frequency}><option value="weekly">{t("weekly")}</option><option value="monthly">{t("monthly")}</option><option value="yearly">{t("yearly")}</option></select></div>
            <div className="flex items-end"><Button size="sm">{t("save")}</Button></div>
          </form>
          <form action={deleteRecurring} className="mt-3"><input type="hidden" name="id" value={r.id} /><Button type="submit" variant="ghost" size="sm" className="text-expense">{t("delete")}</Button></form>
        </details>
      </Card>)}</div>
      <Card className="h-fit">
        <h2 className="text-base font-semibold">{t("add")}</h2>
        {(accounts ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">{t("transactions.noAccountPrompt")}</p> : <form action={createRecurring} className="mt-4 space-y-4">
          <div><Label htmlFor="recurring-account">{t("account")}</Label><select id="recurring-account" name="account_id" className="input" required>{accounts!.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div><Label htmlFor="recurring-type">{t("type")}</Label><select id="recurring-type" name="type" className="input"><option value="expense">{t("expense")}</option><option value="income">{t("income")}</option></select></div>
          <div><Label htmlFor="recurring-category">{t("transactions.category")}</Label><select id="recurring-category" name="category_id" className="input"><option value="">{t("transactions.uncategorized")}</option>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><Label htmlFor="recurring-new-amount">{t("amount")}</Label><Input id="recurring-new-amount" name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div><Label htmlFor="recurring-new-note">{t("note")}</Label><Input id="recurring-new-note" name="note" maxLength={280} /></div>
          <div><Label htmlFor="recurring-frequency">{t("frequency")}</Label><select id="recurring-frequency" name="frequency" className="input"><option value="monthly">{t("monthly")}</option><option value="weekly">{t("weekly")}</option><option value="yearly">{t("yearly")}</option></select></div>
          <div><Label htmlFor="recurring-next-run">{t("nextRun")}</Label><Input id="recurring-next-run" name="next_run" type="date" required /></div>
          <Button type="submit" className="w-full">{t("add")}</Button>
        </form>}
      </Card>
    </div>
  </div>;
}
