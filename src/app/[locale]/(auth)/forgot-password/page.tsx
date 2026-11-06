"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/update-password`,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("forgotPasswordTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {sent ? t("resetSent") : t("forgotPasswordDescription")}
        </p>
      </div>

      {!sent && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : t("sendResetLink")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        <Link href={`/${locale}/login`} className="font-medium text-accent hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </Card>
  );
}
