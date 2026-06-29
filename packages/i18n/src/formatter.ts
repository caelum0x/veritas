// Number and date formatting utilities using Intl APIs
import type { Locale } from "./locale.js";

export interface NumberFormatOptions {
  readonly style?: "decimal" | "currency" | "percent";
  readonly currency?: string;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

export interface DateFormatOptions {
  readonly dateStyle?: "full" | "long" | "medium" | "short";
  readonly timeStyle?: "full" | "long" | "medium" | "short";
}

export function formatNumber(
  locale: Locale,
  value: number,
  options: NumberFormatOptions = {}
): string {
  const { style = "decimal", currency, minimumFractionDigits, maximumFractionDigits } = options;
  const intlOptions: Intl.NumberFormatOptions = {
    style,
    ...(currency !== undefined && { currency }),
    ...(minimumFractionDigits !== undefined && { minimumFractionDigits }),
    ...(maximumFractionDigits !== undefined && { maximumFractionDigits }),
  };
  return new Intl.NumberFormat(locale as string, intlOptions).format(value);
}

export function formatCurrency(
  locale: Locale,
  value: number,
  currency = "USD"
): string {
  return formatNumber(locale, value, { style: "currency", currency });
}

export function formatPercent(
  locale: Locale,
  value: number,
  decimals = 1
): string {
  return formatNumber(locale, value, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(
  locale: Locale,
  value: Date | number | string,
  options: DateFormatOptions = { dateStyle: "medium" }
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale as string, options).format(date);
}

export function formatRelativeTime(
  locale: Locale,
  diffMs: number
): string {
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale as string, { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "second");
}
