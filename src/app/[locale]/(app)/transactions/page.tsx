import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";

export default async function TransactionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("transactions");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: txs }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false }).limit(500),
    supabase.from("accounts").select("id, name").eq("user_id", user!.id),
    supabase.from("categories").select("id, name"),
  ]);

  const accMap = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden p-0">
        {(txs ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{t("noTransactions")}</p>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-surface/50 text-left text-xs font-medium text-muted">
              <tr>
                <th className="px-4 py-2.5">{t("date")}</th>
                <th className="px-4 py-2.5">{t("note")}</th>
                <th className="px-4 py-2.5">{t("account")}</th>
                <th className="px-4 py-2.5">{t("category")}</th>
                <th className="px-4 py-2.5 text-right">{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {(txs ?? []).map((tx) => (
                <tr key={tx.id} className="border-b last:border-b-0 hover:bg-surface/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm text-muted">
                    {new Date(tx.date).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-sm">{tx.note || tx.merchant || "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-muted">{accMap.get(tx.account_id) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-muted">{tx.category_id ? (catMap.get(tx.category_id) ?? "—") : "—"}</td>
                  <td className={`num px-4 py-2.5 text-right text-sm font-medium ${tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-muted"}`}>
                    {formatMoney(Number(tx.amount), tx.currency, locale, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
