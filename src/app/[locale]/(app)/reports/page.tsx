import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { fetchAllUserTransactions } from "@/server/queries/transactions";
import { Card } from "@/components/ui";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, txs] = await Promise.all([
    supabase.from("profiles").select("base_currency").eq("id", user.id).maybeSingle(),
    fetchAllUserTransactions(supabase, user.id, "type,amount_base,date"),
  ]);
  const currency = profile?.base_currency ?? "IDR";
  const income = txs.filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount_base), 0);
  const expense = txs.filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Math.abs(Number(transaction.amount_base)), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-muted">Ringkasan seluruh transaksi yang sudah dicatat.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><div className="text-xs text-muted">Pemasukan</div><div className="mt-2 text-2xl font-semibold text-income">{formatMoney(income, currency, locale)}</div></Card>
        <Card><div className="text-xs text-muted">Pengeluaran</div><div className="mt-2 text-2xl font-semibold text-expense">{formatMoney(expense, currency, locale)}</div></Card>
        <Card><div className="text-xs text-muted">Net cashflow</div><div className="mt-2 text-2xl font-semibold">{formatMoney(income - expense, currency, locale, { signed: true })}</div></Card>
      </div>
    </div>
  );
}