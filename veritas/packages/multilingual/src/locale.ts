// Locale parsing, validation, and formatting per BCP 47

import { z } from "zod";

export const localeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|\d{3})?(-[a-zA-Z0-9]{5,8})*$/, "Invalid BCP 47 locale tag");

export type Locale = z.infer<typeof localeSchema>;

export interface LocaleParts {
  readonly language: string;
  readonly script?: string;
  readonly region?: string;
  readonly variants: readonly string[];
}

/** Parse a BCP 47 locale tag into its components */
export function parseLocale(tag: string): LocaleParts | null {
  const parts = tag.split("-");
  if (parts.length === 0 || !parts[0]) return null;

  const language = parts[0]!.toLowerCase();
  if (!/^[a-z]{2,3}$/.test(language)) return null;

  let idx = 1;
  let script: string | undefined;
  let region: string | undefined;
  const variants: string[] = [];

  // Script subtag: 4 letters, title case
  if (idx < parts.length && /^[A-Z][a-z]{3}$/.test(parts[idx] ?? "")) {
    script = parts[idx++];
  }

  // Region subtag: 2 uppercase letters or 3 digits
  if (idx < parts.length && /^([A-Z]{2}|\d{3})$/.test(parts[idx] ?? "")) {
    region = parts[idx++];
  }

  // Variant subtags
  while (idx < parts.length) {
    const variant = parts[idx++];
    if (variant && /^[a-zA-Z0-9]{5,8}$/.test(variant)) {
      variants.push(variant);
    }
  }

  return { language, script, region, variants };
}

/** Format locale parts back to a BCP 47 tag */
export function formatLocale(parts: LocaleParts): string {
  const segments: string[] = [parts.language];
  if (parts.script) segments.push(parts.script);
  if (parts.region) segments.push(parts.region);
  segments.push(...parts.variants);
  return segments.join("-");
}

/** Normalize a locale tag to canonical BCP 47 form */
export function normalizeLocale(tag: string): string | null {
  const parts = parseLocale(tag);
  if (!parts) return null;
  return formatLocale(parts);
}

/** Extract just the language code from a locale tag */
export function localeLanguage(tag: string): string | null {
  return parseLocale(tag)?.language ?? null;
}

/** Check if two locales share the same language */
export function sameLanguage(a: string, b: string): boolean {
  const la = localeLanguage(a);
  const lb = localeLanguage(b);
  return la !== null && lb !== null && la === lb;
}

/** Resolve the most specific matching locale from a list */
export function resolveLocale(requested: string, available: readonly string[]): string | null {
  const norm = normalizeLocale(requested);
  if (!norm) return null;

  // Exact match first
  if (available.includes(norm)) return norm;

  // Language+region match
  const parts = parseLocale(norm);
  if (!parts) return null;

  if (parts.region) {
    const langRegion = `${parts.language}-${parts.region}`;
    const match = available.find((a) => normalizeLocale(a) === langRegion);
    if (match) return match;
  }

  // Language-only match
  const langMatch = available.find((a) => localeLanguage(a) === parts.language);
  return langMatch ?? null;
}

/** Common locale constants */
export const LOCALE_EN = "en" as const;
export const LOCALE_EN_US = "en-US" as const;
export const LOCALE_EN_GB = "en-GB" as const;
export const LOCALE_ZH_HANS = "zh-Hans" as const;
export const LOCALE_ZH_HANT = "zh-Hant" as const;
export const LOCALE_AR = "ar" as const;
export const LOCALE_ES = "es" as const;
export const LOCALE_FR = "fr" as const;
export const LOCALE_DE = "de" as const;
export const LOCALE_PT = "pt" as const;
export const LOCALE_RU = "ru" as const;
export const LOCALE_JA = "ja" as const;
export const LOCALE_KO = "ko" as const;
