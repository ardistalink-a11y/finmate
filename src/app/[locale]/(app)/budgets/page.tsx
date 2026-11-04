import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";

export default async function BudgetsPage() {
  const t = await getTranslations("comingSoon");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Budget</h1>
      <Card className="py-12 text-center">
        <h2 className="text-base font-medium">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("description")}</p>
      </Card>
    </div>
  );
}
