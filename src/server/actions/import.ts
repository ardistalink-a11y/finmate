"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportResult = { error: string | null; success: string | null };

const MAX_IMPORT_ROWS = 1000;
const MAX_REQUEST_LENGTH = 900_000;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function importTransactions(
  _previousState: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi login sudah berakhir. Silakan masuk lagi.", success: null };

  const accountId = String(formData.get("account_id") ?? "");
  const raw = formData.get("rows");
  if (!accountId || typeof raw !== "string" || raw.length > MAX_REQUEST_LENGTH) {
    return { error: "Data impor tidak valid atau terlalu besar.", success: null };
  }

  let sourceRows: unknown;
  try {
    sourceRows = JSON.parse(raw);
  } catch {
    return { error: "Format data impor tidak valid.", success: null };
  }
  if (!Array.isArray(sourceRows) || sourceRows.length === 0 || sourceRows.length > MAX_IMPORT_ROWS) {
    return { error: `Pilih antara 1 dan ${MAX_IMPORT_ROWS} baris untuk sekali impor.`, success: null };
  }

  const rows: Array<{ date: string; amount: number; description: string | null; merchant: string | null }> = [];
  for (const candidate of sourceRows) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const date = typeof row.date === "string" ? row.date : "";
    const amount = typeof row.amount === "number" || typeof row.amount === "string" ? Number(row.amount) : NaN;
    if (!isValidIsoDate(date) || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1e15) continue;
    rows.push({
      date,
      amount,
      description: typeof row.description === "string" ? row.description.slice(0, 280) : null,
      merchant: typeof row.merchant === "string" ? row.merchant.slice(0, 120) : null,
    });
  }
  if (rows.length === 0) {
    return { error: "Tidak ada baris dengan tanggal dan jumlah yang valid.", success: null };
  }

  const [{ data: account, error: accountError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("accounts").select("currency").eq("id", accountId).eq("user_id", user.id).single(),
    supabase.from("profiles").select("base_currency").eq("id", user.id).maybeSingle(),
  ]);
  if (accountError || !account) return { error: "Dompet tujuan tidak ditemukan.", success: null };
  if (profileError) return { error: "Mata uang dasar tidak dapat dibaca.", success: null };

  const baseCurrency = profile?.base_currency ?? "IDR";
  let fxRate = 1;
  if (account.currency !== baseCurrency) {
    const { data: rate, error: rateError } = await supabase
      .from("fx_rates")
      .select("rate")
      .eq("base", account.currency)
      .eq("quote", baseCurrency)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rateError || !rate || !Number.isFinite(Number(rate.rate)) || Number(rate.rate) <= 0) {
      return { error: `Kurs ${account.currency} ke ${baseCurrency} belum tersedia. Impor dibatalkan.`, success: null };
    }
    fxRate = Number(rate.rate);
  }

  const payload = rows.map((row) => ({
    user_id: user.id,
    account_id: accountId,
    type: row.amount > 0 ? "income" : "expense",
    amount: row.amount,
    currency: account.currency,
    fx_rate: fxRate,
    amount_base: row.amount * fxRate,
    date: row.date,
    note: row.description,
    merchant: row.merchant,
    source: "import",
  }));
  const { error } = await supabase.from("transactions").insert(payload);
  if (error) return { error: "Impor gagal. Periksa data dan coba lagi.", success: null };

  revalidatePath("/", "layout");
  return { error: null, success: `${payload.length} transaksi berhasil diimpor.` };
}