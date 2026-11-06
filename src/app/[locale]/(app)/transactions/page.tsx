import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input, Label } from "@/components/ui";
import { createTransaction, deleteTransactionFromForm } from "@/server/actions/transactions";

export default async function TransactionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("transactions");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: txs }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false }).limit(500),
    supabase.from("accounts").select("id, name").eq("user_id", user!.id).eq("is_archived", false).order("name"),
    supabase.from("categories").select("id, name, type").or(`user_id.eq.${user!.id},user_id.is.null`).order("name"),
  ]);
  const accMap = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-semibold">{t("title")}</h1><p className="text-sm text-muted">{t("subtitle")}</p></div>
      <Card>
        <h2 className="mb-4 text-sm font-semibold">{t("addTransaction")}</h2>
        {(accounts ?? []).length === 0 ? <p className="text-sm text-muted">{t("noAccountPrompt")}</p> : (
          <form action={createTransaction} className="grid gap-4 md:grid-cols-3">
            <div><Label htmlFor="type">{t("type")}</Label><select id="type" name="type" className="input" defaultValue="expense"><option value="expense">{t("types.expense")}</option><option value="income">{t("types.income")}</option></select></div>
            <div><Label htmlFor="account_id">{t("account")}</Label><select id="account_id" name="account_id" className="input" required defaultValue=""><option value="" disabled>{t("chooseAccount")}</option>{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><Label htmlFor="category_id">{t("category")}</Label><select id="category_id" name="category_id" className="input" defaultValue=""><option value="">{t("uncategorized")}</option>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Label htmlFor="amount">{t("amount")}</Label><Input id="amount" name="amount" type="number" min="0.01" step="0.01" required /></div>
            <div><Label htmlFor="date">{t("date")}</Label><Input id="date" name="date" type="date" defaultValue={today} required /></div>
            <div><Label htmlFor="merchant">{t("merchant")}</Label><Input id="merchant" name="merchant" maxLength={120} /></div>
            <div className="md:col-span-2"><Label htmlFor="note">{t("note")}</Label><Input id="note" name="note" maxLength={280} /></div>
            <div className="flex items-end"><Button type="submit" className="w-full">{t("addTransaction")}</Button></div>
          </form>
        )}
      </Card>
      <Card className="overflow-hidden p-0">
        {(txs ?? []).length === 0 ? <p className="py-12 text-center text-sm text-muted">{t("noTransactions")}</p> : (
          <div className="overflow-x-auto"><table className="w-full"><thead className="border-b bg-surface/50 text-left text-xs font-medium text-muted"><tr><th className="px-4 py-2.5">{t("date")}</th><th className="px-4 py-2.5">{t("note")}</th><th className="px-4 py-2.5">{t("account")}</th><th className="px-4 py-2.5">{t("category")}</th><th className="px-4 py-2.5 text-right">{t("amount")}</th><th className="px-4 py-2.5" /></tr></thead><tbody>
            {(txs ?? []).map((tx) => <tr key={tx.id} className="border-b last:border-b-0 hover:bg-surface/40"><td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted">{new Date(tx.date).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}</td><td className="px-4 py-2.5 text-sm">{tx.note || tx.merchant || "—"}</td><td className="px-4 py-2.5 text-sm text-muted">{accMap.get(tx.account_id) ?? "—"}</td><td className="px-4 py-2.5 text-sm text-muted">{tx.category_id ? (catMap.get(tx.category_id) ?? "—") : "—"}</td><td className={`num px-4 py-2.5 text-right text-sm font-medium ${tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-muted"}`}>{formatMoney(tx.type === "expense" ? -Math.abs(Number(tx.amount)) : tx.type === "income" ? Math.abs(Number(tx.amount)) : Number(tx.amount), tx.currency, locale, { signed: true })}</td><td className="px-4 py-2.5"><form action={deleteTransactionFromForm}><input type="hidden" name="id" value={tx.id} /><Button type="submit" variant="ghost" size="sm">{t("deleteConfirm").replace("?", "")}</Button></form></td></tr>)}
          </tbody></table></div>
        )}
      </Card>
    </div>
  );
}
