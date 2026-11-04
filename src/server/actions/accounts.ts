"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validations";

export async function createAccount(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    opening_balance: formData.get("opening_balance") || 0,
  });
  if (!parsed.success) return;

  const { error } = await supabase.from("accounts").insert({ user_id: user.id, ...parsed.data });
  if (error) return;
  revalidatePath("/", "layout");
}

export async function archiveAccount(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id).eq("user_id", user.id);
  if (error) return;
  revalidatePath("/", "layout");
}

export async function archiveAccountFromForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await archiveAccount(id);
}
