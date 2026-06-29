// Public surface of @veritas/i18n — locale, catalog, translation, pluralization, formatting, negotiation
export type { Locale, SupportedLocale } from "./locale.js";
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, asLocale, isSupportedLocale, normalizeLocale, localeToString } from "./locale.js";

export type { MessageValue, MessageRecord, Catalog, CatalogRegistry } from "./catalog.js";
export { createCatalog, createRegistry, registerCatalog, lookupCatalog, mergeCatalogs } from "./catalog.js";

export type { InterpolationValues, TranslateOptions } from "./translator.js";
export { createTranslator, translate } from "./translator.js";

export type { PluralCategory, PluralRule } from "./plural.js";
export { getPluralRule, selectPlural } from "./plural.js";

export type { NumberFormatOptions, DateFormatOptions } from "./formatter.js";
export { formatNumber, formatDate, formatRelativeTime, formatCurrency, formatPercent } from "./formatter.js";

export type { AcceptEntry } from "./negotiator.js";
export { negotiateLocale, parseAcceptLanguage, negotiateFromHeader } from "./negotiator.js";

export type { CatalogFactory, LoaderOptions } from "./loader.js";
export { loadCatalog, buildRegistry, buildDefaultRegistry, listCatalogs } from "./loader.js";

export type { MessageKey } from "./messages/keys.js";
export { MessageKeys } from "./messages/keys.js";

export { enMessages } from "./messages/en.js";

export type { InterpolationVars, I18nContext, CreateI18nContextOptions } from "./context.js";
export { createI18nContext, withLocale } from "./context.js";

export {
  LocaleNotFoundError,
  MessageKeyNotFoundError,
  CatalogLoadError,
  InvalidLocaleError,
  InterpolationError,
} from "./errors.js";
