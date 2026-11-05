/**
 * Import pipeline — parse → normalize → dedupe → categorize.
 * Designed to run in the browser (client-side parse, sensitive data stays local).
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface RawRow {
  [key: string]: string | number | null;
}

export interface ColumnMapping {
  date: string;
  amount: string;
  /** Optional — if debit/credit are separate columns */
  debit?: string;
  credit?: string;
  description?: string;
  merchant?: string;
}

export interface NormalizedRow {
  date: string; // YYYY-MM-DD
  amount: number; // positive income, negative expense
  description: string;
  merchant?: string;
  raw: RawRow;
  fingerprint: string;
}

export async function parseFile(file: File): Promise<{ headers: string[]; rows: RawRow[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) =>
          resolve({ headers: results.meta.fields ?? [], rows: results.data }),
        error: (err) => reject(err),
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<RawRow>(ws, { raw: false });
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    return { headers, rows: json };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

export function suggestMapping(headers: string[]): Partial<ColumnMapping> {
  const find = (candidates: string[]) => {
    for (const c of candidates) {
      const found = headers.find((h) => h.toLowerCase().includes(c));
      if (found) return found;
    }
  };

  return {
    date: find(["tanggal", "date", "tgl"]),
    amount: find(["jumlah", "amount", "nominal", "nilai"]),
    debit: find(["debit", "keluar", "pengeluaran"]),
    credit: find(["kredit", "credit", "masuk", "pemasukan"]),
    description: find(["deskripsi", "keterangan", "description", "remark", "note"]),
    merchant: find(["merchant", "toko"]),
  };
}

/**
 * Normalize raw rows into transactions. Handles both single-amount
 * (signed) and debit/credit split models.
 */
export function normalizeRows(
  rows: RawRow[],
  mapping: ColumnMapping,
  options: { dateFormat?: "auto" | "DMY" | "MDY" | "YMD" } = {}
): NormalizedRow[] {
  const { dateFormat = "auto" } = options;
  const out: NormalizedRow[] = [];

  for (const row of rows) {
    try {
      const date = parseDate(String(row[mapping.date] ?? ""), dateFormat);
      if (!date) continue;

      let amount = 0;
      if (mapping.debit && mapping.credit) {
        const debit = parseNumeric(row[mapping.debit]);
        const credit = parseNumeric(row[mapping.credit]);
        amount = credit - debit;
      } else if (mapping.amount) {
        amount = parseNumeric(row[mapping.amount]);
      }

      if (amount === 0) continue;

      const description = String(row[mapping.description ?? ""] ?? "").trim();
      const merchant = mapping.merchant ? String(row[mapping.merchant] ?? "").trim() : undefined;

      const fingerprint = hashRow(date, amount, description, merchant);

      out.push({ date, amount, description, merchant, raw: row, fingerprint });
    } catch {
      // Skip malformed rows silently; caller can report count
    }
  }

  return out;
}

export function dedupe(rows: NormalizedRow[], seen: Set<string>): {
  unique: NormalizedRow[];
  duplicates: number;
} {
  const unique: NormalizedRow[] = [];
  let duplicates = 0;
  for (const r of rows) {
    if (seen.has(r.fingerprint)) {
      duplicates++;
    } else {
      seen.add(r.fingerprint);
      unique.push(r);
    }
  }
  return { unique, duplicates };
}

// ── helpers ───────────────────────────────────────────────

function parseDate(input: string, format: "auto" | "DMY" | "MDY" | "YMD"): string | null {
  if (!input) return null;
  const s = input.trim();

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const parts = s.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return null;

  const [a, b, c] = parts;
  const year = c.length === 4 ? c : a.length === 4 ? a : null;
  if (!year) return null;

  let day: string, month: string;
  if (format === "DMY" || (format === "auto" && parseInt(a) > 12)) {
    day = a;
    month = b;
  } else if (format === "MDY") {
    month = a;
    day = b;
  } else {
    month = a;
    day = b;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNumeric(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const value = String(v).replace(/[^\d.,-]/g, "").trim();
  if (!value) return 0;

  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  let normalized = value;

  if (lastDot > -1 && lastComma > -1) {
    // The last separator is the decimal mark; the other one groups thousands.
    normalized = lastDot > lastComma
      ? value.replace(/,/g, "")
      : value.replace(/\./g, "").replace(",", ".");
  } else if (lastComma > -1) {
    normalized = value.length - lastComma <= 3
      ? value.replace(",", ".")
      : value.replace(/,/g, "");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function hashRow(date: string, amount: number, description: string, merchant?: string): string {
  const input = `${date}|${amount.toFixed(2)}|${description.toLowerCase()}|${(merchant ?? "").toLowerCase()}`;
  // Simple deterministic hash — for client-side dedupe only
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

// ── auto-categorization ───────────────────────────────────

export interface CategorizationRule {
  field: "description" | "merchant";
  operator: "contains" | "equals" | "starts_with" | "regex";
  value: string;
  set_category_id: string;
  priority: number;
}

export function autoCategorize(
  row: NormalizedRow,
  rules: CategorizationRule[],
  dictionary: Record<string, string> = {}
): string | null {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const fieldValue = String(row[rule.field] ?? "").toLowerCase();
    const value = rule.value.toLowerCase();
    let match = false;

    switch (rule.operator) {
      case "contains": match = fieldValue.includes(value); break;
      case "equals": match = fieldValue === value; break;
      case "starts_with": match = fieldValue.startsWith(value); break;
      case "regex": try { match = new RegExp(rule.value, "i").test(fieldValue); } catch {}
    }

    if (match) return rule.set_category_id;
  }

  // Fallback to dictionary
  const text = `${row.description} ${row.merchant ?? ""}`.toLowerCase();
  for (const [keyword, categoryId] of Object.entries(dictionary)) {
    if (text.includes(keyword)) return categoryId;
  }

  return null;
}
