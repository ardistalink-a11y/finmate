import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootLocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Kalau sudah login, lempar ke dashboard. Kalau belum, lempar ke login.
  if (user) redirect(locale === "id" ? "/dashboard" : `/${locale}/dashboard`);
  redirect(locale === "id" ? "/login" : `/${locale}/login`);
}
