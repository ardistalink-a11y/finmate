"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations";

export async function createTransaction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = transactionSchema.safeParse({
    account_id: formData.get("account_id"),
    category_id: formData.get("category_id") || null,
    type: formData.get("type"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
    merchant: formData.get("merchant") || undefined,
  });
  if (!parsed.success) return;

  const [{ data: account }, { data: profile }] = await Promise.all([
    supabase.from("accounts").select("currency").eq("id", parsed.data.account_id).eq("user_id", user.id).single(),
    supabase.from("profiles").select("base_currency").eq("id", user.id).single(),
  ]);
  if (!account) return;
  const base = profile?.base_currency ?? "IDR";
  const accountCurrency = account.currency;
  let fxRate = 1;
  if (accountCurrency !== base) {
    const { data: rate } = await supabase.from("fx_rates").select("rate").eq("base", accountCurrency).eq("quote", base).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (!rate) return;
    fxRate = Number(rate.rate);
  }
  const signedAmount = parsed.data.type === "expense" ? -Math.abs(parsed.data.amount) : Math.abs(parsed.data.amount);
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: parsed.data.account_id,
    category_id: parsed.data.category_id,
    type: parsed.data.type,
    amount: signedAmount,
    currency: accountCurrency,
    fx_rate: fxRate,
    amount_base: signedAmount * fxRate,
    date: parsed.data.date,
    note: parsed.data.note,
    merchant: parsed.data.merchant,
    source: "manual",
  });
  if (error) return;
  revalidatePath("/", "layout");
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return;
  revalidatePath("/", "layout");
}

export async function deleteTransactionFromForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteTransaction(id);
}
