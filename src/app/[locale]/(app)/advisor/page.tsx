import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";

export default async function AdvisorPage() {
  const t = await getTranslations("comingSoon");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">AI Advisor</h1>
      <Card className="py-12 text-center">
        <h2 className="text-base font-medium">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted">
          Provider abstraction siap di <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">src/lib/ai/</code>. UI chat menyusul.
        </p>
      </Card>
    </div>
  );
}
