// Public surface of @veritas/citations-llm — citation extraction, validation, deduplication and formatting.

export type { CitationSpan } from "./span.js";
export {
  CitationSpanSchema,
  makeSpan,
  spanLength,
  spansOverlap,
  mergeSpans,
} from "./span.js";

export type { RawCitation } from "./extractor.js";
export {
  RawCitationSchema,
  extractFromText,
  extractFromJson,
  toCitationSpan,
} from "./extractor.js";

export type {
  LlmCitation,
  SourceRef,
  DedupeResult,
  ValidationResult,
  ExtractionOptions,
  DedupeOptions,
} from "./types.js";
export { LlmCitationSchema } from "./types.js";

export {
  CitationExtractionError,
  CitationValidationError,
  CitationGroundingError,
  SourceNotFoundError,
  DuplicateCitationError,
} from "./errors.js";

export {
  validateCitations,
  filterByConfidence,
} from "./validator.js";

export {
  deduplicateCitations,
  annotateCitationHashes,
} from "./dedupe.js";

export type { CitationStyleId, CitationStyleMeta } from "./style.js";
export {
  CITATION_STYLES,
  resolveStyle,
  listStyleIds,
} from "./style.js";
