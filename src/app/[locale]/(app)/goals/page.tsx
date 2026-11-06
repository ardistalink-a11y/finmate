import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input, Label } from "@/components/ui";
import { createGoal, updateGoal, deleteGoal } from "@/server/actions/planning";

export default async function GoalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("goals");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: goals } = await s.from("goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-1 text-sm text-muted">{t("subtitle")}</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">{(goals ?? []).length === 0 ? <Card><p className="py-10 text-center text-sm text-muted">{t("empty")}</p></Card> : goals!.map((g) => {
        const target = Number(g.target_amount), current = Number(g.current_amount), progress = target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0;
        return <Card key={g.id}>
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-4"><div><h2 className="font-medium">{g.name}</h2><p className="mt-1 text-xs text-muted">{t("progress")} · {progress.toFixed(0)}%</p></div><p className="num whitespace-nowrap text-right text-sm font-semibold">{formatMoney(current, g.currency, locale)}<span className="text-muted"> / {formatMoney(target, g.currency, locale)}</span></p></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: progress + "%" }} /></div>
            </summary>
            <form action={updateGoal} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={g.id} />
              <div><Label htmlFor={"goal-name-" + g.id}>{t("name")}</Label><Input id={"goal-name-" + g.id} name="name" defaultValue={g.name} required /></div>
              <div><Label htmlFor={"goal-target-" + g.id}>{t("target")}</Label><Input id={"goal-target-" + g.id} name="target_amount" type="number" min="0.01" step="0.01" defaultValue={target} required /></div>
              <div><Label htmlFor={"goal-current-" + g.id}>{t("current")}</Label><Input id={"goal-current-" + g.id} name="current_amount" type="number" min="0" step="0.01" defaultValue={current} required /></div>
              <div><Label htmlFor={"goal-date-" + g.id}>{t("targetDate")}</Label><Input id={"goal-date-" + g.id} name="target_date" type="date" defaultValue={g.target_date ?? ""} /></div>
              <div className="flex items-end"><Button size="sm">{t("save")}</Button></div>
            </form>
            <form action={deleteGoal} className="mt-3"><input type="hidden" name="id" value={g.id} /><Button type="submit" variant="ghost" size="sm" className="text-expense">{t("delete")}</Button></form>
          </details>
        </Card>;
      })}</div>
      <Card className="h-fit">
        <h2 className="text-base font-semibold">{t("add")}</h2>
        <form action={createGoal} className="mt-4 space-y-4">
          <div><Label htmlFor="goal-new-name">{t("name")}</Label><Input id="goal-new-name" name="name" required maxLength={100} /></div>
          <div><Label htmlFor="goal-new-target">{t("target")}</Label><Input id="goal-new-target" name="target_amount" type="number" min="0.01" step="0.01" required /></div>
          <div><Label htmlFor="goal-new-currency">{t("currency")}</Label><select id="goal-new-currency" name="currency" className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option><option>MYR</option></select></div>
          <div><Label htmlFor="goal-new-date">{t("targetDate")}</Label><Input id="goal-new-date" name="target_date" type="date" /></div>
          <Button type="submit" className="w-full">{t("add")}</Button>
        </form>
      </Card>
    </div>
  </div>;
}
