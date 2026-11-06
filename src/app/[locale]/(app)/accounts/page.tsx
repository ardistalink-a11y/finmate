import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { fetchAllUserTransactions } from "@/server/queries/transactions";
import { Card, Button, Input, Label } from "@/components/ui";
import { createAccount, archiveAccountFromForm } from "@/server/actions/accounts";

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("accounts");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: accounts }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user!.id).eq("is_archived", false).order("created_at"),
    supabase.from("profiles").select("base_currency").eq("id", user!.id).single(),
  ]);
  const transactions = await fetchAllUserTransactions(supabase, user!.id, "account_id,amount");
  const balancesByAccount = new Map((accounts ?? []).map((account) => [account.id, Number(account.opening_balance)]));
  for (const transaction of transactions) {
    if (balancesByAccount.has(transaction.account_id)) {
      balancesByAccount.set(
        transaction.account_id,
        (balancesByAccount.get(transaction.account_id) ?? 0) + Number(transaction.amount)
      );
    }
  }
  const totalsByCurrency = new Map<string, number>();
  for (const account of accounts ?? []) {
    totalsByCurrency.set(
      account.currency,
      (totalsByCurrency.get(account.currency) ?? 0) + (balancesByAccount.get(account.id) ?? 0)
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <div className="text-xs font-medium text-muted">{t("totalByCurrency")}</div>
            <div className="mt-1 space-y-1">{Array.from(totalsByCurrency.entries()).map(([currency, amount]) => <div key={currency} className="num text-xl font-semibold">{formatMoney(amount, currency, locale)}</div>)}</div>
          </Card>
          {(accounts ?? []).length === 0 ? (
            <Card className="border-dashed"><p className="py-8 text-center text-sm text-muted">{t("addAccount")}</p></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(accounts ?? []).map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="mt-0.5 text-xs text-muted capitalize">{t(`types.${a.type}`)}</div>
                    </div>
                    <div className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">{a.currency}</div>
                  </div>
                  <div className="mt-4 num text-xl font-semibold">{formatMoney(balancesByAccount.get(a.id) ?? 0, a.currency, locale)}</div>
                  <form action={archiveAccountFromForm} className="mt-4 text-right">
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="sm">{t("archive")}</Button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </div>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">{t("addAccount")}</h2>
          <form action={createAccount} className="space-y-4">
            <div><Label htmlFor="name">{t("name")}</Label><Input id="name" name="name" required maxLength={60} /></div>
            <div><Label htmlFor="type">{t("type")}</Label><select id="type" name="type" className="input" defaultValue="bank"><option value="bank">{t("types.bank")}</option><option value="ewallet">{t("types.ewallet")}</option><option value="cash">{t("types.cash")}</option><option value="credit_card">{t("types.credit_card")}</option><option value="investment">{t("types.investment")}</option><option value="loan">{t("types.loan")}</option></select></div>
            <div><Label htmlFor="currency">{t("currency")}</Label><select id="currency" name="currency" className="input" defaultValue="IDR"><option>IDR</option><option>USD</option><option>SGD</option><option>EUR</option><option>MYR</option></select></div>
            <div><Label htmlFor="opening_balance">{t("openingBalance")}</Label><Input id="opening_balance" name="opening_balance" type="number" step="0.01" defaultValue="0" /></div>
            <Button type="submit" className="w-full">{t("addAccount")}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
