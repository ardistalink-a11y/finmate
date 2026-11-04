"use client";

import { useState } from "react";
import { Button, Card, Label } from "@/components/ui";
import { importTransactions } from "@/server/actions/import";
import { dedupe, normalizeRows, parseFile, suggestMapping, type ColumnMapping, type NormalizedRow } from "@/lib/import";

export function ImportPanel({ accounts }: { accounts: Array<{ id: string; name: string }> }) {
  const [rows, setRows] = useState<NormalizedRow[]>([]);
  const [message, setMessage] = useState("");
  async function onFile(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      const s = suggestMapping(parsed.headers);
      if (!s.date || (!s.amount && !(s.debit && s.credit))) { setMessage("Kolom tanggal dan jumlah tidak terdeteksi."); return; }
      const normalized = normalizeRows(parsed.rows, { date: s.date, amount: s.amount || "", debit: s.debit, credit: s.credit, description: s.description, merchant: s.merchant } as ColumnMapping);
      const result = dedupe(normalized, new Set());
      setRows(result.unique); setMessage(`${result.unique.length} baris siap diimport dari ${parsed.rows.length} baris.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "File tidak bisa dibaca."); }
  }
  return <Card className="space-y-4"><div><Label htmlFor="import-file">File CSV atau XLSX</Label><input id="import-file" type="file" accept=".csv,.xlsx,.xls" className="input" onChange={(e) => onFile(e.target.files?.[0])} /></div>{message && <p className="text-sm text-muted">{message}</p>}{rows.length > 0 && <><div className="overflow-x-auto rounded border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2 text-right">Jumlah</th></tr></thead><tbody>{rows.slice(0, 10).map((r, i) => <tr key={i} className="border-b"><td className="px-3 py-2">{r.date}</td><td className="px-3 py-2">{r.description || "—"}</td><td className="px-3 py-2 text-right">{r.amount.toLocaleString("id-ID")}</td></tr>)}</tbody></table></div><form action={importTransactions} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="rows" value={JSON.stringify(rows.map(({ date, amount, description, merchant }) => ({ date, amount, description, merchant })))} /><select name="account_id" className="input" required defaultValue=""><option value="" disabled>Pilih dompet tujuan</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><Button type="submit">Import {rows.length} baris</Button></form></>}</Card>;
}
