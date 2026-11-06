import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input, Label } from "@/components/ui";
import { createDebt, updateDebt, deleteDebt } from "@/server/actions/planning";

export default async function DebtsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("debts");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: debts } = await s.from("debts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-1 text-sm text-muted">{t("subtitle")}</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">{(debts ?? []).length === 0 ? <Card><p className="py-10 text-center text-sm text-muted">{t("empty")}</p></Card> : debts!.map((d) => <Card key={d.id}>
        <details>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4"><div><h2 className="font-medium">{d.name}</h2><p className="mt-1 text-xs text-muted">{t("interestRate")}: {Number(d.interest_rate ?? 0)}%</p></div><p className="num whitespace-nowrap text-lg font-semibold">{formatMoney(Number(d.outstanding), d.currency, locale)}</p></summary>
          <form action={updateDebt} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={d.id} />
            <div><Label htmlFor={"debt-name-" + d.id}>{t("name")}</Label><Input id={"debt-name-" + d.id} name="name" defaultValue={d.name} required /></div>
            <div><Label htmlFor={"debt-outstanding-" + d.id}>{t("outstanding")}</Label><Input id={"debt-outstanding-" + d.id} name="outstanding" type="number" min="0" step="0.01" defaultValue={d.outstanding} required /></div>
            <div><Label htmlFor={"debt-interest-" + d.id}>{t("interestRate")}</Label><Input id={"debt-interest-" + d.id} name="interest_rate" type="number" min="0" step="0.01" defaultValue={d.interest_rate ?? 0} /></div>
            <div><Label htmlFor={"debt-date-" + d.id}>{t("dueDate")}</Label><Input id={"debt-date-" + d.id} name="due_date" type="date" defaultValue={d.due_date ?? ""} /></div>
            <div className="flex items-end"><Button size="sm">{t("save")}</Button></div>
          </form>
          <form action={deleteDebt} className="mt-3"><input type="hidden" name="id" value={d.id} /><Button type="submit" variant="ghost" size="sm" className="text-expense">{t("delete")}</Button></form>
        </details>
      </Card>)}</div>
      <Card className="h-fit">
        <h2 className="text-base font-semibold">{t("add")}</h2>
        <form action={createDebt} className="mt-4 space-y-4">
          <div><Label htmlFor="debt-new-name">{t("name")}</Label><Input id="debt-new-name" name="name" required maxLength={100} /></div>
          <div><Label htmlFor="debt-new-principal">{t("principal")}</Label><Input id="debt-new-principal" name="principal" type="number" min="0.01" step="0.01" required /></div>
          <div><Label htmlFor="debt-new-currency">{t("currency")}</Label><select id="debt-new-currency" name="currency" className="input"><option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option><option>MYR</option></select></div>
          <div><Label htmlFor="debt-new-interest">{t("interestRate")}</Label><Input id="debt-new-interest" name="interest_rate" type="number" min="0" step="0.01" defaultValue="0" /></div>
          <div><Label htmlFor="debt-new-date">{t("dueDate")}</Label><Input id="debt-new-date" name="due_date" type="date" /></div>
          <Button type="submit" className="w-full">{t("add")}</Button>
        </form>
      </Card>
    </div>
  </div>;
}
