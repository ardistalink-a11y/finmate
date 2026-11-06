"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Label } from "@/components/ui";
import { importTransactions } from "@/server/actions/import";
import { dedupe, normalizeRows, parseFile, suggestMapping, type ColumnMapping, type NormalizedRow } from "@/lib/import";

const initialImportState = { error: null, success: null };

export function ImportPanel({ accounts }: { accounts: Array<{ id: string; name: string }> }) {
  const t = useTranslations("import");
  const [rows, setRows] = useState<NormalizedRow[]>([]);
  const [message, setMessage] = useState("");
  const [importState, formAction, pending] = useActionState(importTransactions, initialImportState);

  async function onFile(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      const suggested = suggestMapping(parsed.headers);
      if (!suggested.date || (!suggested.amount && !(suggested.debit && suggested.credit))) {
        setRows([]);
        setMessage(t("detectedError"));
        return;
      }
      const normalized = normalizeRows(parsed.rows, {
        date: suggested.date,
        amount: suggested.amount || "",
        debit: suggested.debit,
        credit: suggested.credit,
        description: suggested.description,
        merchant: suggested.merchant,
      } as ColumnMapping);
      const result = dedupe(normalized, new Set());
      if (result.unique.length > 1000) {
        setRows([]);
        setMessage(t("tooMany"));
        return;
      }
      setRows(result.unique);
      setMessage(t("ready", { count: result.unique.length, total: parsed.rows.length }));
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : t("unreadable"));
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <Label htmlFor="import-file">{t("file")}</Label>
        <input id="import-file" type="file" accept=".csv,.xlsx,.xls" className="input" onChange={(event) => onFile(event.target.files?.[0])} />
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      {rows.length > 0 && (
        <>
          <section aria-label={t("preview")} className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">{t("date")}</th><th className="px-3 py-2">{t("description")}</th><th className="px-3 py-2 text-right">{t("amount")}</th></tr></thead>
              <tbody>{rows.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-t"><td className="px-3 py-2">{row.date}</td><td className="px-3 py-2">{row.description || "—"}</td><td className="num px-3 py-2 text-right">{row.amount.toLocaleString()}</td></tr>
              ))}</tbody>
            </table>
          </section>
          {accounts.length === 0 ? <p className="text-sm text-muted">{t("emptyAccounts")}</p> : <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="rows" value={JSON.stringify(rows.map(({ date, amount, description, merchant }) => ({ date, amount, description, merchant })))} />
            <select name="account_id" className="input" required defaultValue=""><option value="" disabled>{t("chooseAccount")}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            <Button type="submit" disabled={pending}>{pending ? t("importing") : t("importRows", { count: rows.length })}</Button>
          </form>}
          {importState.error && <p role="alert" className="text-sm text-expense">{importState.error}</p>}
          {importState.success && <p role="status" className="text-sm text-income">{importState.success}</p>}
        </>
      )}
    </Card>
  );
}
