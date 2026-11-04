/**
 * Cashflow forecasting — three layers:
 *   1. Baseline from historical averages
 *   2. Recurring rules + scheduled debt payments
 *   3. Monte Carlo confidence band (P10 / P50 / P90)
 */

export interface MonthlySnapshot {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export interface RecurringEvent {
  month: string; // YYYY-MM
  amount: number; // negative for expense, positive for income
  label?: string;
}

export interface ForecastPoint {
  month: string;
  p10: number;
  p50: number;
  p90: number;
  baseline: number;
  net: number;
  events: RecurringEvent[];
}

export interface ForecastInput {
  history: MonthlySnapshot[]; // at least 3 months recommended
  recurring: RecurringEvent[];
  startingBalance: number;
  monthsAhead?: number;
  iterations?: number;
}

export function forecast(input: ForecastInput): ForecastPoint[] {
  const { history, recurring, startingBalance, monthsAhead = 12, iterations = 1000 } = input;

  const { avgIncome, avgExpense, stdIncome, stdExpense } = historicalStats(history);
  const recurringByMonth = groupByMonth(recurring);

  const results: ForecastPoint[] = [];
  let balance = startingBalance;

  // Pre-generate all months starting from next month
  const now = new Date();
  const months: string[] = [];
  for (let i = 1; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  for (const month of months) {
    const events = recurringByMonth[month] ?? [];
    const eventNet = events.reduce((s, e) => s + e.amount, 0);
    const baseline = avgIncome - avgExpense + eventNet;
    balance += baseline;

    // Monte Carlo — sample each month's net
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const income = Math.max(0, gaussianSample(avgIncome, stdIncome));
      const expense = Math.max(0, gaussianSample(avgExpense, stdExpense));
      samples.push(income - expense + eventNet);
    }
    samples.sort((a, b) => a - b);

    const p10 = samples[Math.floor(iterations * 0.1)];
    const p50 = samples[Math.floor(iterations * 0.5)];
    const p90 = samples[Math.floor(iterations * 0.9)];

    results.push({
      month,
      baseline: round2(balance),
      net: round2(baseline),
      p10: round2(balance - (p50 - p10)),
      p50: round2(balance),
      p90: round2(balance + (p90 - p50)),
      events,
    });
  }

  return results;
}

function historicalStats(history: MonthlySnapshot[]) {
  if (history.length === 0) {
    return { avgIncome: 0, avgExpense: 0, stdIncome: 0, stdExpense: 0 };
  }

  const incomes = history.map((h) => h.income);
  const expenses = history.map((h) => h.expense);

  return {
    avgIncome: mean(incomes),
    avgExpense: mean(expenses),
    stdIncome: stddev(incomes),
    stdExpense: stddev(expenses),
  };
}

function groupByMonth(events: RecurringEvent[]): Record<string, RecurringEvent[]> {
  const out: Record<string, RecurringEvent[]> = {};
  for (const e of events) {
    (out[e.month] ??= []).push(e);
  }
  return out;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Box-Muller transform for normally distributed samples. */
function gaussianSample(mean: number, std: number): number {
  if (std === 0) return mean;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
