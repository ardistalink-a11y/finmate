"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";
import { toast } from "sonner";

export default function RegisterPage() {
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

    const { data, error } = await supabase.auth.signUp({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      options: {
        data: { full_name: String(formData.get("full_name")) },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/onboarding`,
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      router.push(`/${locale}/onboarding`);
      router.refresh();
    } else {
      toast.success(t("registerSuccess"));
      router.push(`/${locale}/login`);
    }
  }

  async function signUpWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/onboarding` },
    });
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("registerTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="full_name">{t("fullName")}</Label>
          <Input id="full_name" name="full_name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t("register")}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-border" />
            {t("orContinueWith")}
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={signUpWithGoogle}>
            {t("withGoogle")}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted">
        {t("haveAccount")}{" "}
        <Link href={`/${locale}/login`} className="font-medium text-accent hover:underline">
          {t("login")}
        </Link>
      </p>
    </Card>
  );
}
