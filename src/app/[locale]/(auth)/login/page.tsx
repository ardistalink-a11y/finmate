"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";
import { toast } from "sonner";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard` },
    });
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("loginSubtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link href={`/${locale}/forgot-password`} className="text-xs text-accent hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t("login")}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-border" />
            {t("orContinueWith")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
            {t("withGoogle")}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href={`/${locale}/register`} className="font-medium text-accent hover:underline">
          {t("register")}
        </Link>
      </p>
    </Card>
  );
}
