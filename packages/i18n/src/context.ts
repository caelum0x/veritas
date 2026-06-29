// i18n context — bundles locale, registry, translator and formatter into a single runtime object
import type { CatalogRegistry } from "./catalog.js";
import type { Locale } from "./locale.js";
import { DEFAULT_LOCALE, normalizeLocale } from "./locale.js";
import { buildDefaultRegistry } from "./loader.js";
import { lookupCatalog } from "./catalog.js";
import { getPluralRule, selectPlural, type PluralCategory } from "./plural.js";

/** Interpolation variables map. */
export type InterpolationVars = Readonly<Record<string, string | number>>;

/** Translate a message key with optional variable interpolation. */
function interpolate(template: string, vars: InterpolationVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

/** The i18n context used throughout the application. */
export interface I18nContext {
  /** Active locale. */
  readonly locale: Locale;
  /** Full catalog registry. */
  readonly registry: CatalogRegistry;
  /**
   * Translate a message key, interpolating optional variables.
   * Returns the key itself if no message is found (never throws).
   */
  t(key: string, vars?: InterpolationVars): string;
  /**
   * Translate a pluralisable message key.
   * The catalog value is used as the "other" form; pass `forms` to override.
   */
  plural(
    key: string,
    count: number,
    vars?: InterpolationVars,
    forms?: Partial<Record<PluralCategory, string>>
  ): string;
}

/** Options for creating an I18nContext. */
export interface CreateI18nContextOptions {
  locale?: Locale;
  registry?: CatalogRegistry;
}

/** Create an immutable I18nContext. */
export function createI18nContext(
  options: CreateI18nContextOptions = {}
): I18nContext {
  const locale: Locale = options.locale ?? DEFAULT_LOCALE;
  const registry: CatalogRegistry = options.registry ?? buildDefaultRegistry();

  function resolve(key: string): string | undefined {
    const catalog = lookupCatalog(registry, locale);
    if (catalog?.messages[key] !== undefined) return catalog.messages[key];
    // Fallback to default locale
    const fallbackCatalog = lookupCatalog(registry, DEFAULT_LOCALE);
    return fallbackCatalog?.messages[key];
  }

  function t(key: string, vars?: InterpolationVars): string {
    const template = resolve(key) ?? key;
    return vars ? interpolate(template, vars) : template;
  }

  function plural(
    key: string,
    count: number,
    vars?: InterpolationVars,
    forms?: Partial<Record<PluralCategory, string>>
  ): string {
    const baseTemplate = resolve(key) ?? key;
    const mergedForms: Partial<Record<PluralCategory, string>> = {
      other: baseTemplate,
      ...forms,
    };
    const selected = selectPlural(locale, count, mergedForms);
    const mergedVars: InterpolationVars = { count, ...vars };
    return interpolate(selected, mergedVars);
  }

  return Object.freeze({ locale, registry, t, plural });
}

/**
 * Derive a new context from an existing one with a different locale string.
 * The registry is reused as-is.
 */
export function withLocale(ctx: I18nContext, rawLocale: string): I18nContext {
  return createI18nContext({
    locale: normalizeLocale(rawLocale),
    registry: ctx.registry,
  });
}
