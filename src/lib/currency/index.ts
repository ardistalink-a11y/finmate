/**
 * Currency utilities — pure functions, safe on client & server.
 * All conversions go through a `base` currency (profiles.base_currency).
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  IDR: { code: "IDR", symbol: "Rp", decimals: 0 },
  USD: { code: "USD", symbol: "$", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", decimals: 2 },
  EUR: { code: "EUR", symbol: "€", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", decimals: 0 },
  AUD: { code: "AUD", symbol: "A$", decimals: 2 },
  MYR: { code: "MYR", symbol: "RM", decimals: 2 },
  CNY: { code: "CNY", symbol: "¥", decimals: 2 },
  KRW: { code: "KRW", symbol: "₩", decimals: 0 },
};

export function formatMoney(
  amount: number,
  currency: string,
  locale: string = "id",
  opts: { showSymbol?: boolean; signed?: boolean } = {}
): string {
  const info = CURRENCIES[currency] ?? { code: currency, symbol: currency, decimals: 2 };
  const { showSymbol = true, signed = false } = opts;

  const formatter = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: info.decimals,
    maximumFractionDigits: info.decimals,
  });

  const abs = Math.abs(amount);
  const formatted = formatter.format(abs);
  const sign = signed ? (amount > 0 ? "+" : amount < 0 ? "−" : "") : amount < 0 ? "−" : "";
  const symbol = showSymbol ? (currency === "IDR" ? `${info.symbol} ` : `${info.symbol}`) : "";

  return `${sign}${symbol}${formatted}`.trim();
}

/** Round to currency's decimal places (avoid float drift). */
export function roundMoney(amount: number, currency: string): number {
  const decimals = CURRENCIES[currency]?.decimals ?? 2;
  return Math.round(amount * 10 ** decimals) / 10 ** decimals;
}

/**
 * Convert amount from one currency to another using a rate table.
 * `rates` maps code → rate relative to base (1 unit = rate of base).
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    throw new Error(`Missing rate for ${from}→${to}`);
  }
  // amount (in `from`) → base = amount * fromRate
  // base → `to` = base / toRate
  return (amount * fromRate) / toRate;
}

/** Parse a user-entered amount string into a number, respecting locale separators. */
export function parseAmount(input: string, locale: string = "id"): number {
  if (!input) return 0;
  const cleaned = input.trim().replace(/\s/g, "");
  // If both separators exist, last one is the decimal
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized: string;

  if (lastDot > -1 && lastComma > -1) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma > -1) {
    // Locale-aware: id uses comma as decimal only if there's 1-2 digits after
    const afterComma = cleaned.length - lastComma - 1;
    normalized = afterComma <= 2 ? cleaned.replace(",", ".") : cleaned.split(",").join("");
  } else {
    normalized = cleaned;
  }

  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}
