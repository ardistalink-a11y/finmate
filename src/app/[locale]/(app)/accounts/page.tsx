import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("accounts");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: accounts }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user!.id).eq("is_archived", false),
    supabase.from("profiles").select("base_currency").eq("id", user!.id).single(),
  ]);

  const base = profile?.base_currency ?? "IDR";

  const total = (accounts ?? []).reduce((s, a) => s + Number(a.opening_balance), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>

      <Card>
        <div className="text-xs font-medium text-muted">{t("total", { currency: base })}</div>
        <div className="mt-1 num text-2xl font-semibold">{formatMoney(total, base, locale)}</div>
      </Card>

      {(accounts ?? []).length === 0 ? (
        <Card className="border-dashed">
          <p className="py-8 text-center text-sm text-muted">
            {t("addAccount")} — {t("subtitle")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(accounts ?? []).map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="mt-0.5 text-xs text-muted capitalize">{t(`types.${a.type}`)}</div>
                </div>
                <div className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">{a.currency}</div>
              </div>
              <div className="mt-4 num text-xl font-semibold">
                {formatMoney(Number(a.opening_balance), a.currency, locale)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
