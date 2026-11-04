"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function importTransactions(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const accountId = String(formData.get("account_id") || "");
  const raw = String(formData.get("rows") || "[]");
  let rows: Array<{ date: string; amount: number; description?: string; merchant?: string }> = [];
  try { rows = JSON.parse(raw); } catch { return; }
  if (!accountId || !rows.length || rows.length > 5000) return;
  const { data: account } = await supabase.from("accounts").select("currency").eq("id", accountId).eq("user_id", user.id).single();
  if (!account) return;
  const payload = rows.filter((r) => r.date && Number.isFinite(Number(r.amount)) && Number(r.amount) !== 0).map((r) => {
    const amount = Number(r.amount);
    return { user_id: user.id, account_id: accountId, type: amount >= 0 ? "income" : "expense", amount, currency: account.currency, fx_rate: 1, amount_base: amount, date: r.date, note: r.description || null, merchant: r.merchant || null, source: "import" };
  });
  if (payload.length) await supabase.from("transactions").insert(payload);
  revalidatePath("/", "layout");
}
