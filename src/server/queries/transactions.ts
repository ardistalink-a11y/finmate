import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function fetchAllUserTransactions(
  supabase: SupabaseClient,
  userId: string,
  columns = "*"
) {
  const pageSize = 1000;
  let offset = 0;
  const transactions: Array<Record<string, unknown>> = [];

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(columns)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to load transactions: ${error.message}`);
    const page = (data ?? []) as Array<Record<string, unknown>>;
    transactions.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return transactions;
}