import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";
import { Card, Button, Input } from "@/components/ui";
import { MonthlyCashflowChart } from "@/components/dashboard/monthly-cashflow-chart";
import { ReportTableTools, type ReportTransaction } from "@/components/reports/report-table-tools";

type DateRange = {
  start: string;
  end: string;
  previousStart?: string;
  previousEnd?: string;
};

type DbTransaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  amount_base: number;
  currency: string;
  date: string;
  note: string | null;
  merchant: string | null;
  category_id: string | null;
  account_id: string;
};

const TRANSACTION_COLUMNS =
  "id,type,amount,amount_base,currency,date,note,merchant,category_id,account_id";

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, amount: number) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateString(date);
}

function isDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = utcDate(value);
  return !Number.isNaN(parsed.getTime()) && dateString(parsed) === value;
}

function getDateRange(
  range: string,
  customStart: string | undefined,
  customEnd: string | undefined,
  today: string
): DateRange {
  const todayDate = utcDate(today);
  const monthStart = dateString(new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1)));

  if (range === "all") return { start: "", end: today };
  if (range === "custom") {
    if (isDateString(customStart) && isDateString(customEnd) && customStart <= customEnd) {
      return { start: customStart, end: customEnd };
    }
  }

  let start: string;
  let end = today;
  if (range === "last_month") {
    const thisMonth = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1));
    thisMonth.setUTCDate(0);
    end = dateString(thisMonth);
    start = dateString(new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth(), 1)));
  } else if (range === "3m" || range === "6m" || range === "12m") {
    const months = Number(range.slice(0, -1));
    start = dateString(new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - months + 1, 1)));
  } else {
    start = monthStart;
  }

  const elapsedDays = Math.floor((utcDate(end).getTime() - utcDate(start).getTime()) / 86_400_000) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(elapsedDays - 1));
  return { start, end, previousStart, previousEnd };
}

async function fetchTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  start?: string,
  end?: string
): Promise<DbTransaction[]> {
  const rows: DbTransaction[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    let query = supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("user_id", userId);
    if (start) query = query.gte("date", start);
    if (end) query = query.lte("date", end);

    const { data, error } = await query
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Unable to load report transactions: ${error.message}`);
    const page = (data ?? []) as unknown as DbTransaction[];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

function buildMonthlyTrend(rows: DbTransaction[], start: string, end: string) {
  const buckets = new Map<string, { month: string; income: number; expense: number }>();
  const first = utcDate(start);
  const last = utcDate(end);
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));

  while (cursor <= lastMonth) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { month: key, income: 0, expense: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  for (const row of rows) {
    const bucket = buckets.get(row.date.slice(0, 7));
    if (!bucket) continue;
    if (row.type === "income") bucket.income += Number(row.amount_base);
    if (row.type === "expense") bucket.expense += Math.abs(Number(row.amount_base));
  }

  return Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    income: Math.round(bucket.income * 100) / 100,
    expense: Math.round(bucket.expense * 100) / 100,
  }));
}

function budgetLimitForRange(
  amount: number,
  period: "weekly" | "monthly" | "yearly",
  start: string,
  end: string
) {
  let total = 0;
  let cursor = utcDate(start);
  const last = utcDate(end);

  if (period === "weekly") {
    const days = Math.floor((last.getTime() - cursor.getTime()) / 86_400_000) + 1;
    return (amount * days) / 7;
  }

  if (period === "monthly") {
    while (cursor <= last) {
      const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
      const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      const monthEnd = new Date(nextMonth.getTime() - 86_400_000);
      const overlapStart = cursor > monthStart ? cursor : monthStart;
      const overlapEnd = last < monthEnd ? last : monthEnd;
      const overlapDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000) + 1;
      const monthDays = monthEnd.getUTCDate();
      total += (amount * overlapDays) / monthDays;
      cursor = nextMonth;
    }
    return total;
  }

  while (cursor <= last) {
    const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
    const nextYear = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
    const yearEnd = new Date(nextYear.getTime() - 86_400_000);
    const overlapStart = cursor > yearStart ? cursor : yearStart;
    const overlapEnd = last < yearEnd ? last : yearEnd;
    const overlapDays = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000) + 1;
    const yearDays = Math.floor((nextYear.getTime() - yearStart.getTime()) / 86_400_000);
    total += (amount * overlapDays) / yearDays;
    cursor = nextYear;
  }
  return total;
}

function Breakdown({
  title,
  rows,
  total,
  emptyLabel,
  currency,
  locale,
  countLabel,
}: {
  title: string;
  rows: { name: string; total: number; count: number }[];
  total: number;
  emptyLabel: string;
  currency: string;
  locale: string;
  countLabel: string;
}) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const percent = total > 0 ? (row.total / total) * 100 : 0;
            return (
              <li key={row.name}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{row.name}</span>
                  <span className="num shrink-0 text-right text-xs text-muted">
                    {formatMoney(row.total, currency, locale)} · {percent.toFixed(1)}% · {row.count} {countLabel}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("reports");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const one = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const allowedRanges = ["current_month", "last_month", "3m", "6m", "12m", "all", "custom"];
  const requestedRange = one(search.range) ?? "12m";
  const selectedRange = allowedRanges.includes(requestedRange) ? requestedRange : "12m";
  const today = new Date().toISOString().slice(0, 10);
  const dateRange = getDateRange(selectedRange, one(search.from), one(search.to), today);

  const [selectedRows, previousRows, profileResult, accountsResult, categoriesResult, budgetsResult] =
    await Promise.all([
      fetchTransactions(
        supabase,
        user.id,
        dateRange.start || undefined,
        dateRange.end
      ),
      dateRange.previousStart && dateRange.previousEnd
        ? fetchTransactions(supabase, user.id, dateRange.previousStart, dateRange.previousEnd)
        : Promise.resolve([] as DbTransaction[]),
      supabase.from("profiles").select("base_currency").eq("id", user.id).maybeSingle(),
      supabase.from("accounts").select("id,name,currency").eq("user_id", user.id),
      supabase
        .from("categories")
        .select("id,name,type")
        .or(`user_id.eq.${user.id},user_id.is.null`),
      supabase
        .from("budgets")
        .select("id,name,category_id,amount,currency,period,start_date,end_date,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);

  const currency = profileResult.data?.base_currency ?? "IDR";
  const start = dateRange.start || selectedRows.reduce(
    (earliest, row) => (row.date < earliest ? row.date : earliest),
    today
  );
  const end = dateRange.end;
  const selected = selectedRows.filter((row) => row.date >= start && row.date <= end);
  const previous = previousRows;
  const cashflow = (rows: DbTransaction[]) => {
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.type === "income") income += Number(row.amount_base);
      if (row.type === "expense") expense += Math.abs(Number(row.amount_base));
    }
    return { income, expense, net: income - expense };
  };
  const currentTotals = cashflow(selected);
  const previousTotals = cashflow(previous);
  const savingsRate = currentTotals.income > 0
    ? (currentTotals.net / currentTotals.income) * 100
    : 0;
  const previousSavingsRate = previousTotals.income > 0
    ? (previousTotals.net / previousTotals.income) * 100
    : 0;
  const previousDateLabel = dateRange.previousStart && dateRange.previousEnd
    ? `${dateRange.previousStart} – ${dateRange.previousEnd}`
    : t("comparisonUnavailable");

  const categories = categoriesResult.data ?? [];
  const accountOptions = accountsResult.data ?? [];
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const accountMap = new Map(accountOptions.map((account) => [account.id, account.name]));

  const aggregateBy = (kind: "income" | "expense") => {
    const groups = new Map<string, { name: string; total: number; count: number }>();
    for (const row of selected) {
      if (row.type !== kind) continue;
      const key = row.category_id ?? "__uncategorized";
      const group = groups.get(key) ?? { key,
        name: row.category_id
          ? categoryMap.get(row.category_id) ?? t("uncategorized")
          : t("uncategorized"),
        total: 0,
        count: 0,
      };
      group.total += kind === "expense"
        ? Math.abs(Number(row.amount_base))
        : Number(row.amount_base);
      group.count += 1;
      groups.set(key, group);
    }
    return Array.from(groups.values())
      .map((group) => ({ ...group, total: Math.round(group.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  };
  const expenseCategories = aggregateBy("expense");
  const incomeCategories = aggregateBy("income");

  const accountGroups = new Map<string, { income: number; expense: number; count: number }>();
  for (const row of selected) {
    if (row.type === "transfer") continue;
    const group = accountGroups.get(row.account_id) ?? { income: 0, expense: 0, count: 0 };
    if (row.type === "income") group.income += Number(row.amount_base);
    if (row.type === "expense") group.expense += Math.abs(Number(row.amount_base));
    group.count += 1;
    accountGroups.set(row.account_id, group);
  }
  const accounts = Array.from(accountGroups.entries())
    .map(([id, group]) => ({
      id,
      name: accountMap.get(id) ?? t("unknownAccount"),
      ...group,
      net: group.income - group.expense,
    }))
    .sort((a, b) => b.expense - a.expense);

  const reportTransactions: ReportTransaction[] = selected.map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: Math.abs(Number(row.amount)),
    amountBase: Number(row.amount_base),
    currency: row.currency,
    description: row.note || row.merchant || "—",
    category: row.category_id
      ? categoryMap.get(row.category_id) ?? t("uncategorized")
      : t("uncategorized"),
    account: accountMap.get(row.account_id) ?? t("unknownAccount"),
  }));

  const reportBudgets = (budgetsResult.data ?? [])
    .filter((budget) => budget.start_date <= end && (!budget.end_date || budget.end_date >= start))
    .map((budget) => {
      const overlapStart = budget.start_date > start ? budget.start_date : start;
      const overlapEnd = budget.end_date && budget.end_date < end ? budget.end_date : end;
      const limit = budgetLimitForRange(
        Number(budget.amount),
        budget.period as "weekly" | "monthly" | "yearly",
        overlapStart,
        overlapEnd
      );
      const spent = selected
        .filter((row) => row.date >= overlapStart && row.date <= overlapEnd)
        .filter((row) => row.type === "expense")
        .filter((row) => budget.category_id
          ? row.category_id === budget.category_id
          : true
        )
        .reduce((total, row) => total + Math.abs(Number(row.amount_base)), 0);
      const comparable = budget.currency === currency;
      return {
        id: budget.id,
        name: budget.name,
        category: budget.category_id
          ? categoryMap.get(budget.category_id) ?? t("uncategorized")
          : t("allCategories"),
        period: budget.period,
        periodLabel: budget.period === "weekly"
          ? t("weekly")
          : budget.period === "yearly"
            ? t("yearly")
            : t("monthly"),
        currency: budget.currency,
        limit,
        spent,
        comparable,
        percent: comparable && limit > 0 ? (spent / limit) * 100 : null,
      };
    });

  const trend = buildMonthlyTrend(selected, start, end);
  const dateFormatter = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (value: string) => dateFormatter.format(utcDate(value));
  const amountChange = (current: number, old: number) =>
    old === 0 && current !== 0
      ? t("noPreviousValue")
      : formatMoney(current - old, currency, locale, { signed: true });
  const rateChange = previousTotals.income === 0
    ? t("noPreviousValue")
    : `${(savingsRate - previousSavingsRate).toFixed(1)} pp`;

  const rangeTitle = selectedRange === "all"
    ? t("allTime")
    : `${formatDate(start)} – ${formatDate(end)}`;
  const reportExportData = {
    summary: {
      income: currentTotals.income,
      expense: currentTotals.expense,
      net: currentTotals.net,
      savingsRate,
      previousIncome: previousTotals.income,
      previousExpense: previousTotals.expense,
      previousNet: previousTotals.net,
      previousSavingsRate,
      comparisonPeriod: previousDateLabel,
    },
    trend,
    expenseCategories,
    incomeCategories,
    wallets: accounts,
    budgets: reportBudgets.map((budget) => ({
      name: budget.name,
      category: budget.category,
      period: budget.periodLabel,
      currency: budget.currency,
      limit: budget.limit,
      spent: budget.spent,
      comparable: budget.comparable,
      percent: budget.percent,
    })),
  };
  const tableLabels = {
    exportCsv: t("exportCsv"),
    savePdf: t("savePdf"),
    search: t("searchTransactions"),
    date: t("date"),
    type: t("type"),
    description: t("description"),
    category: t("category"),
    account: t("account"),
    amount: t("amount"),
    currency: t("currency"),
    amountBase: t("amountInBase"),
    income: t("income"),
    expense: t("expense"),
    transfer: t("transfer"),
    previous: t("previous"),
    next: t("next"),
    page: t("page"),
    of: t("of"),
    noTransactions: t("noTransactions"),
    noSearchResults: t("noSearchResults"),
    reportTitle: t("title"),
    periodSummary: t("periodSummary"),
    savingsRate: t("savingsRate"),
    previousPeriod: t("vsPrevious"),
    monthlyTrend: t("monthlyTrend"),
    month: t("month"),
    netCashflow: t("netCashflow"),
    expensesByCategory: t("expensesByCategory"),
    incomeBySource: t("incomeBySource"),
    walletSummary: t("accountSummary"),
    budgetVsActual: t("budgetVsActual"),
    budgetName: t("budgetName"),
    budgetPeriod: t("period"),
    budgetAmount: t("budgetAmount"),
    actualAmount: t("actualAmount"),
    utilization: t("utilization"),
    transactionCount: t("transactionCount"),
    incomparable: t("incomparable"),
  };

  return (
    <div className="report-page mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("description")}</p>
      </div>

      <Card className="report-print-hide">
        <form method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="report-range" className="label">{t("period")}</label>
            <select id="report-range" name="range" className="input" defaultValue={selectedRange}>
              <option value="current_month">{t("currentMonth")}</option>
              <option value="last_month">{t("lastMonth")}</option>
              <option value="3m">{t("last3Months")}</option>
              <option value="6m">{t("last6Months")}</option>
              <option value="12m">{t("last12Months")}</option>
              <option value="all">{t("allTime")}</option>
              <option value="custom">{t("customRange")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="report-from" className="label">{t("from")}</label>
            <Input id="report-from" type="date" name="from" defaultValue={start} />
          </div>
          <div>
            <label htmlFor="report-to" className="label">{t("to")}</label>
            <Input id="report-to" type="date" name="to" defaultValue={end} />
          </div>
          <Button type="submit">{t("apply")}</Button>
        </form>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t("periodSummary")}</h2>
          <p className="text-xs text-muted">{rangeTitle}</p>
        </div>
        <p className="text-xs text-muted">{selected.length} {t("transactionCount")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs font-medium text-muted">{t("income")}</div>
          <div className="mt-2 num text-xl font-semibold text-income">
            {formatMoney(currentTotals.income, currency, locale)}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("vsPrevious")}: {amountChange(currentTotals.income, previousTotals.income)}
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium text-muted">{t("expense")}</div>
          <div className="mt-2 num text-xl font-semibold text-expense">
            {formatMoney(currentTotals.expense, currency, locale)}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("vsPrevious")}: {amountChange(currentTotals.expense, previousTotals.expense)}
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium text-muted">{t("netCashflow")}</div>
          <div className="mt-2 num text-xl font-semibold">
            {formatMoney(currentTotals.net, currency, locale, { signed: true })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("vsPrevious")}: {amountChange(currentTotals.net, previousTotals.net)}
          </p>
        </Card>
        <Card>
          <div className="text-xs font-medium text-muted">{t("savingsRate")}</div>
          <div className="mt-2 num text-xl font-semibold">
            {savingsRate.toFixed(1)}%
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("vsPrevious")}: {rateChange}
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">{t("monthlyTrend")}</h2>
          <p className="mt-1 text-xs text-muted">{t("monthlyTrendDescription")}</p>
        </div>
        <MonthlyCashflowChart
          data={trend}
          locale={locale}
          currency={currency}
          incomeLabel={t("income")}
          expenseLabel={t("expense")}
          monthRangeLabel={t("slideToViewMonths")}
        />
        <div className="mt-4 hidden overflow-x-auto print:block">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted">
              <tr>
                <th className="py-2">{t("month")}</th>
                <th className="py-2 text-right">{t("income")}</th>
                <th className="py-2 text-right">{t("expense")}</th>
                <th className="py-2 text-right">{t("netCashflow")}</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((item) => (
                <tr key={item.month} className="border-b last:border-0">
                  <td className="py-1.5">
                    {new Date(`${item.month}-01T12:00:00`).toLocaleDateString(
                      locale === "id" ? "id-ID" : "en-US",
                      { month: "long", year: "numeric" }
                    )}
                  </td>
                  <td className="num py-1.5 text-right">{formatMoney(item.income, currency, locale)}</td>
                  <td className="num py-1.5 text-right">{formatMoney(item.expense, currency, locale)}</td>
                  <td className="num py-1.5 text-right">
                    {formatMoney(item.income - item.expense, currency, locale, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title={t("expensesByCategory")}
          rows={expenseCategories}
          total={currentTotals.expense}
          emptyLabel={t("noCategoryData")}
          currency={currency}
          locale={locale}
          countLabel={t("transactionCount")}
        />
        <Breakdown
          title={t("incomeBySource")}
          rows={incomeCategories}
          total={currentTotals.income}
          emptyLabel={t("noCategoryData")}
          currency={currency}
          locale={locale}
          countLabel={t("transactionCount")}
        />
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">{t("accountSummary")}</h2>
        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("noAccountData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b bg-surface/50 text-left text-xs font-medium text-muted">
                <tr>
                  <th className="px-3 py-2.5">{t("account")}</th>
                  <th className="px-3 py-2.5 text-right">{t("income")}</th>
                  <th className="px-3 py-2.5 text-right">{t("expense")}</th>
                  <th className="px-3 py-2.5 text-right">{t("netCashflow")}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5 text-sm">{account.name}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm text-income">
                      {formatMoney(account.income, currency, locale)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm text-expense">
                      {formatMoney(account.expense, currency, locale)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm">
                      {formatMoney(account.net, currency, locale, { signed: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">{t("budgetVsActual")}</h2>
          <p className="mt-1 text-xs text-muted">{t("budgetDescription")}</p>
        </div>
        {reportBudgets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t("noBudgetData")}</p>
        ) : (
          <div className="space-y-4">
            {reportBudgets.map((budget) => (
              <div key={budget.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{budget.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {budget.category} · {t(budget.period)}
                    </div>
                  </div>
                  {budget.comparable ? (
                    <div className="text-right text-sm">
                      <div className="num">
                        {formatMoney(budget.spent, currency, locale)} / {formatMoney(budget.limit, currency, locale)}
                      </div>
                      <div className="text-xs text-muted">
                        {budget.percent === null
                          ? t("budgetAmountUnavailable")
                          : `${budget.percent.toFixed(1)}% · ${formatMoney(budget.limit - budget.spent, currency, locale, { signed: true })} ${t("remaining")}`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-muted">
                      {t("currencyMismatch", { budgetCurrency: budget.currency, baseCurrency: currency })}
                    </div>
                  )}
                </div>
                {budget.comparable && budget.percent !== null ? (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${budget.percent > 100 ? "bg-expense" : "bg-accent"}`}
                      style={{ width: `${Math.min(100, budget.percent)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">{t("transactionDetails")}</h2>
          <p className="mt-1 text-xs text-muted">
            {t("transactionsInPeriod", { period: rangeTitle })}
          </p>
        </div>
        <ReportTableTools
          rows={reportTransactions}
          labels={tableLabels}
          locale={locale}
          baseCurrency={currency}
          dateFrom={start}
          dateTo={end}
          exportData={reportExportData}
        />
      </div>
      <p className="text-xs text-muted">{t("comparisonPeriod")}: {previousDateLabel}</p>
    </div>
  );
}
