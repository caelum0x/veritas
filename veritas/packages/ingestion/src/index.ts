// @veritas/ingestion: public surface re-exporting all ingestion pipeline modules.

export type { Extractor, ExtractedContent, ExtractorRegistry } from "./extractor.js";

export { DocumentSchema, makeDocument } from "./document.js";
export type { IngestedDocument } from "./document.js";

export { SourceRefSchema, makeSourceRef } from "./source-ref.js";
export type { SourceRef } from "./source-ref.js";

export { chunkText } from "./chunker.js";
export type { TextChunk, ChunkOptions } from "./chunker.js";

export { normalizeText, countWords, countChars } from "./normalizer.js";
export type { NormalizerOptions } from "./normalizer.js";

export { InMemoryExtractorRegistry, buildRegistry } from "./registry.js";

export { TextExtractor } from "./extractors/text-extractor.js";
export { HtmlExtractor } from "./extractors/html-extractor.js";
export { PdfExtractor, MockPdfParser } from "./extractors/pdf-extractor.js";
export type { PdfParserPort } from "./extractors/pdf-extractor.js";
export { OcrExtractor, MockOcrEngine } from "./extractors/ocr-extractor.js";
export type { OcrEnginePort, OcrMimeType } from "./extractors/ocr-extractor.js";
export { TranscriptExtractor, MockAsrEngine } from "./extractors/transcript-extractor.js";
export type { AsrEnginePort } from "./extractors/transcript-extractor.js";

export { IngestionPipeline, MockFetcher, MockLanguageDetector } from "./pipeline.js";
export type { FetcherPort, PipelineConfig } from "./pipeline.js";

export { HeuristicLanguageDetector, detectLanguage } from "./language-detect.js";
export type { LanguageDetectorPort } from "./language-detect.js";

export { DocumentMetadataSchema, mergeMetadata, fromStringRecord } from "./metadata.js";
export type { DocumentMetadata } from "./metadata.js";

export { ClaimCandidateSchema, extractClaimCandidates } from "./claim-extractor-bridge.js";
export type { ClaimCandidate } from "./claim-extractor-bridge.js";

export {
  createIngestionJob,
  startJob,
  advanceStage,
  succeedJob,
  failJob,
  cancelJob,
  toIngestionProgress,
  InMemoryJobStore,
  IngestionJobSchema,
} from "./job.js";
export type { IngestionJob } from "./job.js";

export {
  IngestionStage,
  IngestionOptionsSchema,
  DEFAULT_INGESTION_OPTIONS,
} from "./types.js";
export type { IngestionOptions, IngestionResult, IngestionProgress } from "./types.js";

export {
  IngestionError,
  UnsupportedMimeTypeError,
  ExtractionFailedError,
  FetchFailedError,
  DocumentTooLargeError,
  LanguageDetectionError,
  JobNotFoundError,
  InvalidSourceUrlError,
} from "./errors.js";
