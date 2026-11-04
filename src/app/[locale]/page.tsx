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
  // Keep redirects explicit because the app routes are nested under [locale].
  if (user) redirect(`/${locale}/dashboard`);
  redirect(`/${locale}/login`);
}
