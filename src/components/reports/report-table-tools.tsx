"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/currency";

export type ReportTransaction = {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  amountBase: number;
  currency: string;
  description: string;
  category: string;
  account: string;
};

type Labels = {
  exportCsv: string;
  savePdf: string;
  search: string;
  date: string;
  type: string;
  description: string;
  category: string;
  account: string;
  amount: string;
  amountBase: string;
  income: string;
  expense: string;
  transfer: string;
  previous: string;
  next: string;
  page: string;
  of: string;
  noTransactions: string;
  noSearchResults: string;
};

export function ReportTableTools({
  rows,
  labels,
  locale,
  baseCurrency,
  dateFrom,
  dateTo,
}: {
  rows: ReportTransaction[];
  labels: Labels;
  locale: string;
  baseCurrency: string;
  dateFrom: string;
  dateTo: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const query = search.trim().toLocaleLowerCase();
  const filteredRows = query
    ? rows.filter((row) =>
        [row.description, row.category, row.account, row.type, row.date]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      )
    : rows;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const typeLabel = (type: ReportTransaction["type"]) => labels[type];

  function downloadCsv() {
    const csvRows = [
      [
        labels.date,
        labels.type,
        labels.description,
        labels.category,
        labels.account,
        labels.amount,
        labels.currency,
        labels.amountBase,
        baseCurrency,
      ],
      ...filteredRows.map((row) => [
        row.date,
        typeLabel(row.type),
        row.description,
        row.category,
        row.account,
        Math.abs(row.amount),
        row.currency,
        row.type === "transfer"
          ? ""
          : row.type === "expense"
            ? -Math.abs(row.amountBase)
            : Math.abs(row.amountBase),
        row.type === "transfer" ? "" : baseCurrency,
      ]),
    ];
    const escapeCell = (value: string | number) => {
      const text = String(value);
      const safeText = typeof value === "string" && /^[=+@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const csv = csvRows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finmate-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          aria-label={labels.search}
          placeholder={labels.search}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          className="max-w-sm"
        />
        <div className="report-print-hide flex gap-2">
          <Button type="button" variant="outline" onClick={downloadCsv}>
            {labels.exportCsv}
          </Button>
          <Button type="button" onClick={() => window.print()}>
            {labels.savePdf}
          </Button>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {rows.length === 0 ? labels.noTransactions : labels.noSearchResults}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="border-b bg-surface/50 text-left text-xs font-medium text-muted">
              <tr>
                <th className="px-3 py-2.5">{labels.date}</th>
                <th className="px-3 py-2.5">{labels.type}</th>
                <th className="px-3 py-2.5">{labels.description}</th>
                <th className="px-3 py-2.5">{labels.category}</th>
                <th className="px-3 py-2.5">{labels.account}</th>
                <th className="px-3 py-2.5 text-right">{labels.amount}</th>
                <th className="px-3 py-2.5 text-right">{labels.amountBase}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const baseAmount =
                  row.type === "transfer"
                    ? null
                    : row.type === "expense"
                      ? -Math.abs(row.amountBase)
                      : Math.abs(row.amountBase);
                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted">
                      {new Date(`${row.date}T12:00:00`).toLocaleDateString(
                        locale === "id" ? "id-ID" : "en-US",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 text-sm ${
                        row.type === "income"
                          ? "text-income"
                          : row.type === "expense"
                            ? "text-expense"
                            : "text-muted"
                      }`}
                    >
                      {typeLabel(row.type)}
                    </td>
                    <td className="max-w-56 truncate px-3 py-2.5 text-sm">
                      {row.description}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted">{row.category}</td>
                    <td className="px-3 py-2.5 text-sm text-muted">{row.account}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm">
                      {formatMoney(Math.abs(row.amount), row.currency, locale)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm">
                      {baseAmount === null
                        ? "—"
                        : formatMoney(baseAmount, baseCurrency, locale, { signed: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="report-print-hide flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {labels.page} {filteredRows.length === 0 ? 0 : currentPage * pageSize + 1}–
          {Math.min((currentPage + 1) * pageSize, filteredRows.length)} {labels.of}{" "}
          {filteredRows.length}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            {labels.previous}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            {labels.next}
          </Button>
        </div>
      </div>
    </Card>
  );
}
