// Pluralization rules for supported locales
import type { Locale } from "./locale.js";

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export type PluralRule = (count: number) => PluralCategory;

const englishPlural: PluralRule = (n) => (n === 1 ? "one" : "other");

const frenchPlural: PluralRule = (n) => (n <= 1 ? "one" : "other");

const germanPlural: PluralRule = (n) => (n === 1 ? "one" : "other");

const spanishPlural: PluralRule = (n) => (n === 1 ? "one" : "other");

const japanesePlural: PluralRule = () => "other";

const chinesePlural: PluralRule = () => "other";

const PLURAL_RULES: Record<string, PluralRule> = {
  en: englishPlural,
  es: spanishPlural,
  fr: frenchPlural,
  de: germanPlural,
  ja: japanesePlural,
  zh: chinesePlural,
};

export function getPluralRule(locale: Locale): PluralRule {
  const lang = (locale as string).split("-")[0] ?? (locale as string);
  return PLURAL_RULES[lang] ?? englishPlural;
}

export function selectPlural(
  locale: Locale,
  count: number,
  forms: Partial<Record<PluralCategory, string>>
): string {
  const rule = getPluralRule(locale);
  const category = rule(count);
  return forms[category] ?? forms["other"] ?? String(count);
}
