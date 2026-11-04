import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-md bg-accent" />
          <span className="text-lg font-semibold">{t("appName")}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
