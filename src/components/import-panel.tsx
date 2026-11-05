"use client";

import { useActionState, useState } from "react";
import { Button, Card, Label } from "@/components/ui";
import { importTransactions } from "@/server/actions/import";
import { dedupe, normalizeRows, parseFile, suggestMapping, type ColumnMapping, type NormalizedRow } from "@/lib/import";

const initialImportState = { error: null, success: null };

export function ImportPanel({ accounts }: { accounts: Array<{ id: string; name: string }> }) {
  const [rows, setRows] = useState<NormalizedRow[]>([]);
  const [message, setMessage] = useState("");
  const [importState, formAction, pending] = useActionState(importTransactions, initialImportState);

  async function onFile(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      const s = suggestMapping(parsed.headers);
      if (!s.date || (!s.amount && !(s.debit && s.credit))) {
        setRows([]);
        setMessage("Kolom tanggal dan jumlah tidak terdeteksi.");
        return;
      }
      const normalized = normalizeRows(parsed.rows, {
        date: s.date,
        amount: s.amount || "",
        debit: s.debit,
        credit: s.credit,
        description: s.description,
        merchant: s.merchant,
      } as ColumnMapping);
      const result = dedupe(normalized, new Set());
      if (result.unique.length > 1000) {
        setRows([]);
        setMessage("Maksimal 1.000 transaksi per impor. Pecah file lalu coba lagi.");
        return;
      }
      setRows(result.unique);
      setMessage(`${result.unique.length} baris siap diimpor dari ${parsed.rows.length} baris.`);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "File tidak bisa dibaca.");
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <Label htmlFor="import-file">File CSV atau XLSX</Label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="input"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Deskripsi</th><th className="px-3 py-2 text-right">Jumlah</th></tr></thead>
              <tbody>
                {rows.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.description || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.amount.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="hidden"
              name="rows"
              value={JSON.stringify(rows.map(({ date, amount, description, merchant }) => ({ date, amount, description, merchant })))}
            />
            <select name="account_id" className="input" required defaultValue="">
              <option value="" disabled>Pilih dompet tujuan</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <Button type="submit" disabled={pending}>
              {pending ? "Mengimpor…" : `Impor ${rows.length} baris`}
            </Button>
          </form>
          {importState.error && <p role="alert" className="text-sm text-expense">{importState.error}</p>}
          {importState.success && <p role="status" className="text-sm text-income">{importState.success}</p>}
        </>
      )}
    </Card>
  );
}