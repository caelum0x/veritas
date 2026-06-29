// Accept-Language header negotiation — picks the best supported locale from a weighted list
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, type SupportedLocale, asLocale, isSupportedLocale } from "./locale.js";

export interface AcceptEntry {
  readonly tag: string;
  readonly quality: number;
}

/** Parse an Accept-Language header value into a sorted list of entries. */
export function parseAcceptLanguage(header: string): readonly AcceptEntry[] {
  const entries: AcceptEntry[] = [];
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [tagPart, qPart] = trimmed.split(";") as [string, string | undefined];
    const tag = (tagPart ?? "").trim().toLowerCase();
    if (!tag) continue;
    let quality = 1.0;
    if (qPart) {
      const qMatch = qPart.trim().match(/^q\s*=\s*([0-9.]+)$/i);
      if (qMatch) {
        const parsed = parseFloat(qMatch[1] ?? "1");
        quality = isNaN(parsed) ? 1.0 : Math.min(1.0, Math.max(0, parsed));
      }
    }
    entries.push({ tag, quality });
  }
  return entries.sort((a, b) => b.quality - a.quality);
}

/**
 * Negotiate the best supported locale from a parsed Accept-Language list.
 * Matches full tag first (e.g. "en-US"), then language subtag (e.g. "en").
 * Falls back to DEFAULT_LOCALE.
 */
export function negotiateLocale(
  entries: readonly AcceptEntry[],
  supported: readonly SupportedLocale[] = SUPPORTED_LOCALES
): Locale {
  for (const { tag } of entries) {
    if (isSupportedLocale(tag) && supported.includes(tag as SupportedLocale)) {
      return asLocale(tag);
    }
    const lang = tag.split("-")[0] ?? tag;
    if (isSupportedLocale(lang) && supported.includes(lang as SupportedLocale)) {
      return asLocale(lang);
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Convenience wrapper: parse the raw Accept-Language header string and return
 * the best matching supported locale.
 */
export function negotiateFromHeader(
  header: string,
  supported: readonly SupportedLocale[] = SUPPORTED_LOCALES
): Locale {
  const entries = parseAcceptLanguage(header);
  return negotiateLocale(entries, supported);
}
