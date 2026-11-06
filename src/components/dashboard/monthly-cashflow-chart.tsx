"use client";

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
};

export function MonthlyCashflowChart({
  data,
  locale,
  currency,
  incomeLabel,
  expenseLabel,
}: MonthlyCashflowChartProps) {
  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const monthFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    year: "2-digit",
  });
  const currencyFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const compactFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const chartData = data.map((item) => ({
    ...item,
    monthLabel: monthFormatter.format(new Date(`${item.month}-01T12:00:00`)),
  }));

  return (
    <div
      role="img"
      aria-label={`${incomeLabel} · ${expenseLabel}`}
      className="h-72 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
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
  );
}
