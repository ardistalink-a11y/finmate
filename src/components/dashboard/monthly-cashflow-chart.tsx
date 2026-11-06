"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyCashflow = {
  month: string;
  income: number;
  expense: number;
};

type MonthlyCashflowChartProps = {
  data: MonthlyCashflow[];
  locale: string;
  currency: string;
  incomeLabel: string;
  expenseLabel: string;
  monthRangeLabel: string;
};

export function MonthlyCashflowChart({
  data,
  locale,
  currency,
  incomeLabel,
  expenseLabel,
  monthRangeLabel,
}: MonthlyCashflowChartProps) {
  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const monthFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    year: "numeric",
  });
  const currencyFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  });
  const compactFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const chartData = data
    .map((item) => ({
      ...item,
      monthLabel: monthFormatter.format(new Date(`${item.month}-01T12:00:00`)),
    }))
    .sort((first, second) => first.month.localeCompare(second.month));
  const visibleMonthCount = Math.min(6, chartData.length);
  const maxStartIndex = Math.max(0, chartData.length - visibleMonthCount);
  const [startIndex, setStartIndex] = useState(maxStartIndex);
  const currentStartIndex = Math.min(startIndex, maxStartIndex);
  const visibleData = chartData.slice(
    currentStartIndex,
    currentStartIndex + visibleMonthCount
  );
  const rangeStart = visibleData[0]?.monthLabel;
  const rangeEnd = visibleData[visibleData.length - 1]?.monthLabel;

  return (
    <div className="w-full">
      <div
        role="img"
        aria-label={`${incomeLabel} · ${expenseLabel}`}
        className="h-72 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            barGap={4}
            barCategoryGap="22%"
          >
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: "hsl(var(--muted))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              width={72}
              tickFormatter={(value: number) => compactFormatter.format(value)}
              tick={{ fill: "hsl(var(--muted))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => currencyFormatter.format(Number(value))}
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                borderColor: "hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--fg))",
              }}
              labelStyle={{ color: "hsl(var(--muted))" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="income"
              name={incomeLabel}
              fill="hsl(var(--income))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expense"
              name={expenseLabel}
              fill="hsl(var(--expense))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="report-print-hide mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{rangeStart}</span>
          <span>{rangeEnd}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxStartIndex}
          step={1}
          value={currentStartIndex}
          onChange={(event) => setStartIndex(Number(event.target.value))}
          aria-label={monthRangeLabel}
          disabled={maxStartIndex === 0}
          className="w-full accent-accent disabled:opacity-50"
        />
        <p className="mt-1 text-center text-xs text-muted">{monthRangeLabel}</p>
      </div>
    </div>
  );
}
