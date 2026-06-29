// @veritas/corpus: trusted source corpus management — public surface re-export.

export {
  CorpusSchema,
  CreateCorpusSchema,
  UpdateCorpusSchema,
  type Corpus,
  type CreateCorpus,
  type UpdateCorpus,
} from "./corpus.js";

export {
  CorpusRecordSchema,
  CreateCorpusRecordSchema,
  type CorpusRecord,
  type CreateCorpusRecord,
} from "./record.js";

export {
  CorpusSnapshotSchema,
  buildSnapshot,
  type CorpusSnapshot,
} from "./snapshot.js";

export {
  CorpusFilterSchema,
  CorpusSortSchema,
  CorpusPageRequestSchema,
  toAuthorityTier,
  toQualityBand,
  type CorpusFilter,
  type CorpusSort,
  type CorpusPageRequest,
  type AuthorityTier,
  type QualityBand,
  type CurationAction,
  type CorpusRef,
  type DiffMode,
} from "./types.js";

export {
  CorpusNotFoundError,
  CorpusRecordNotFoundError,
  SnapshotNotFoundError,
  CorpusConflictError,
  CorpusThresholdError,
  CurationNotPermittedError,
  CorpusImportError,
} from "./errors.js";

export {
  computeCorpusStats,
  formatStatsSummary,
  type CorpusStats,
  type AuthorityDistribution,
  type QualityDistribution,
} from "./stats.js";
