"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function createBudget(formData: FormData): Promise<void> {
  const ctx = await userClient(); if (!ctx) return;
  await ctx.supabase.from("budgets").insert({ user_id: ctx.user.id, name: String(formData.get("name") || "Budget"), amount: Number(formData.get("amount") || 0), currency: String(formData.get("currency") || "IDR"), period: String(formData.get("period") || "monthly"), start_date: String(formData.get("start_date") || new Date().toISOString().slice(0, 10)) });
  revalidatePath("/", "layout");
}

export async function createGoal(formData: FormData): Promise<void> {
  const ctx = await userClient(); if (!ctx) return;
  await ctx.supabase.from("goals").insert({ user_id: ctx.user.id, name: String(formData.get("name") || "Goal"), target_amount: Number(formData.get("target_amount") || 0), currency: String(formData.get("currency") || "IDR"), target_date: String(formData.get("target_date") || "") || null });
  revalidatePath("/", "layout");
}

export async function createDebt(formData: FormData): Promise<void> {
  const ctx = await userClient(); if (!ctx) return;
  const principal = Number(formData.get("principal") || 0);
  await ctx.supabase.from("debts").insert({ user_id: ctx.user.id, name: String(formData.get("name") || "Debt"), principal, outstanding: principal, interest_rate: Number(formData.get("interest_rate") || 0), currency: String(formData.get("currency") || "IDR"), due_date: String(formData.get("due_date") || "") || null });
  revalidatePath("/", "layout");
}

export async function createRecurring(formData: FormData): Promise<void> {
  const ctx = await userClient(); if (!ctx) return;
  await ctx.supabase.from("recurring_transactions").insert({ user_id: ctx.user.id, account_id: String(formData.get("account_id")), category_id: String(formData.get("category_id") || "") || null, type: String(formData.get("type") || "expense"), amount: Number(formData.get("amount") || 0), note: String(formData.get("note") || "") || null, frequency: String(formData.get("frequency") || "monthly"), next_run: String(formData.get("next_run") || new Date().toISOString().slice(0, 10)) });
  revalidatePath("/", "layout");
}
