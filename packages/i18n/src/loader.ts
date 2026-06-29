// Catalog loader — registers built-in locales and supports dynamic catalog injection
import { tryAsync, type Result } from "@veritas/core";
import { createCatalog, registerCatalog, createRegistry, type Catalog, type CatalogRegistry } from "./catalog.js";
import { asLocale, DEFAULT_LOCALE, type Locale } from "./locale.js";
import { CatalogLoadError } from "./errors.js";
import { enMessages } from "./messages/en.js";

/** Factory function that returns a MessageRecord for a given locale tag. */
export type CatalogFactory = (locale: string) => Promise<Record<string, string>>;

/** Options for configuring the loader. */
export interface LoaderOptions {
  /** Additional locale factories registered by the consumer. */
  readonly factories?: ReadonlyMap<string, CatalogFactory>;
}

/** Seed the registry with the bundled English catalog. */
function seedBuiltins(): CatalogRegistry {
  const en = createCatalog(DEFAULT_LOCALE, enMessages);
  return registerCatalog(createRegistry(), en);
}

/** Load a catalog for the given locale using a registered factory, then register it. */
export async function loadCatalog(
  registry: CatalogRegistry,
  locale: Locale,
  factory: CatalogFactory
): Promise<Result<CatalogRegistry, CatalogLoadError>> {
  const localeStr = locale as string;
  const result = await tryAsync<Record<string, string>>(
    () => factory(localeStr)
  );
  if (!result.ok) {
    return { ok: false, error: new CatalogLoadError(localeStr, result.error) };
  }
  const catalog = createCatalog(locale, result.value);
  return { ok: true, value: registerCatalog(registry, catalog) };
}

/** Build a registry pre-loaded with built-in English plus any provided factories. */
export async function buildRegistry(
  options: LoaderOptions = {}
): Promise<Result<CatalogRegistry, CatalogLoadError>> {
  let registry = seedBuiltins();
  const factories = options.factories ?? new Map<string, CatalogFactory>();
  for (const [localeStr, factory] of factories) {
    const locale = asLocale(localeStr);
    const loadResult = await loadCatalog(registry, locale, factory);
    if (!loadResult.ok) return loadResult;
    registry = loadResult.value;
  }
  return { ok: true, value: registry };
}

/** Synchronously create a registry containing only the built-in English catalog. */
export function buildDefaultRegistry(): CatalogRegistry {
  return seedBuiltins();
}

/** Return all currently registered catalogs as an array. */
export function listCatalogs(registry: CatalogRegistry): readonly Catalog[] {
  return Array.from(registry.catalogs.values());
}
