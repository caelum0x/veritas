// Core translate and interpolate functions for i18n message resolution
import type { Locale } from "./locale.js";
import type { CatalogRegistry } from "./catalog.js";
import { lookupCatalog } from "./catalog.js";
import { DEFAULT_LOCALE } from "./locale.js";
import { selectPlural } from "./plural.js";
import type { PluralCategory } from "./plural.js";

export type InterpolationValues = Record<string, string | number>;

export interface TranslateOptions {
  readonly values?: InterpolationValues;
  readonly count?: number;
  readonly pluralForms?: Partial<Record<PluralCategory, string>>;
  readonly fallbackLocale?: Locale;
}

function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = values[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

export function translate(
  registry: CatalogRegistry,
  locale: Locale,
  key: string,
  options: TranslateOptions = {}
): string {
  const { values = {}, count, pluralForms, fallbackLocale = DEFAULT_LOCALE } = options;

  const catalog = lookupCatalog(registry, locale) ?? lookupCatalog(registry, fallbackLocale);
  if (catalog === undefined) return key;

  let template: string | undefined;

  if (count !== undefined && pluralForms !== undefined) {
    template = selectPlural(locale, count, pluralForms);
  } else {
    template = catalog.messages[key];
  }

  if (template === undefined) {
    const fallback = lookupCatalog(registry, fallbackLocale);
    template = fallback?.messages[key] ?? key;
  }

  const merged: InterpolationValues = count !== undefined ? { count, ...values } : values;
  return Object.keys(merged).length > 0 ? interpolate(template, merged) : template;
}

export function createTranslator(registry: CatalogRegistry, locale: Locale) {
  return (key: string, options?: TranslateOptions): string =>
    translate(registry, locale, key, options);
}
