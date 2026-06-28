// Locale type definitions and supported locale registry
import { Brand, brand } from "@veritas/core";

export type Locale = Brand<string, "Locale">;

export const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "ja", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = brand<string, "Locale">("en");

export function asLocale(value: string): Locale {
  return brand<string, "Locale">(value);
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string): Locale {
  const lower = value.toLowerCase().replace(/_/g, "-");
  const lang = lower.split("-")[0] ?? lower;
  if (isSupportedLocale(lang)) return asLocale(lang);
  return DEFAULT_LOCALE;
}

export function localeToString(locale: Locale): string {
  return locale as string;
}
