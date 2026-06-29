// Message catalog type definitions and registry
import type { Locale } from "./locale.js";

export type MessageValue = string;
export type MessageRecord = Record<string, MessageValue>;

export interface Catalog {
  readonly locale: Locale;
  readonly messages: Readonly<MessageRecord>;
}

export interface CatalogRegistry {
  readonly catalogs: ReadonlyMap<string, Catalog>;
}

export function createCatalog(locale: Locale, messages: MessageRecord): Catalog {
  return { locale, messages: Object.freeze({ ...messages }) };
}

export function createRegistry(): CatalogRegistry {
  const catalogs = new Map<string, Catalog>();
  return { catalogs };
}

export function registerCatalog(
  registry: CatalogRegistry,
  catalog: Catalog
): CatalogRegistry {
  const next = new Map(registry.catalogs);
  next.set(catalog.locale as string, catalog);
  return { catalogs: next };
}

export function lookupCatalog(
  registry: CatalogRegistry,
  locale: Locale
): Catalog | undefined {
  return registry.catalogs.get(locale as string);
}

export function mergeCatalogs(base: Catalog, override: Catalog): Catalog {
  return createCatalog(override.locale, {
    ...base.messages,
    ...override.messages,
  });
}
