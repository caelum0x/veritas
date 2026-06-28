// Public surface of @veritas/importers.

export type { RawItem, ImportRunResult, ImporterConfig, Importer, ImportSink } from "./importer.js";

export type {
  ImporterKind,
  ImporterEntry,
  RegisterSourceParams,
  DedupeRecord,
  RateControlOptions,
  MappedClaim,
} from "./types.js";

export {
  importerKindSchema,
  importerEntrySchema,
  registerSourceParamsSchema,
} from "./types.js";

export {
  FetchError,
  ParseError,
  UnknownImporterError,
  DuplicateSourceError,
  DuplicateItemError,
  RateLimitError,
  MappingError,
} from "./errors.js";

export { ImporterRegistry } from "./registry.js";

export { createCsvImporter } from "./csv-importer.js";
export type { CsvImporterConfig } from "./csv-importer.js";

export { createRssImporter } from "./rss-importer.js";
export type { RssImporterConfig } from "./rss-importer.js";

export { createJsonImporter } from "./json-importer.js";

export { mapRawItem, mapRawItems } from "./mapping.js";
export type { MappingOptions } from "./mapping.js";

export {
  createInMemoryDedupeStore,
  hashRawItem,
  checkAndRecord,
  dedupeItems,
} from "./dedupe.js";
export type { DedupeStore, DedupeResult } from "./dedupe.js";

export {
  createRateController,
  withRateControl,
} from "./rate-control.js";
export type { RateController } from "./rate-control.js";

export {
  runSyncCycle,
  startSyncScheduler,
} from "./source-sync.js";
export type { SyncCycleResult, SourceSyncOptions } from "./source-sync.js";
