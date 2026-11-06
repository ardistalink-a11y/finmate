"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Label, Card } from "@/components/ui";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password.length < 8) {
      toast.error(t("passwordMin"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError || !data.user) {
      setLoading(false);
      toast.error(t("recoverySessionInvalid"));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("passwordUpdated"));
    router.replace(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <Card className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("updatePasswordTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("updatePasswordDescription")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">{t("newPassword")}</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t("updatePassword")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link href={`/${locale}/forgot-password`} className="font-medium text-accent hover:underline">
          {t("requestAnotherReset")}
        </Link>
      </p>
    </Card>
  );
}
