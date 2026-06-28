// @veritas/bias-detection: public surface re-export barrel.

// Shared domain types
export type {
  BiasType,
  BiasSeverity,
  BiasSpan,
  BiasFlag,
  SentimentResult,
  FramingSignal,
  SourceBiasProfile,
  LLMBiasAnalysis,
  BiasScore,
  BiasReport,
  BiasDetectionContext,
} from "./types.js";
export { BiasTypeSchema, BiasSeveritySchema } from "./types.js";

// Error classes
export {
  BiasDetectionError,
  LLMBiasAnalysisError,
  SourceBiasLookupError,
  InvalidBiasInputError,
} from "./errors.js";

// Lexicon
export type { LexiconEntry, Lexicon, LexiconMatch } from "./lexicon.js";
export { buildDefaultLexicon, matchLexicon } from "./lexicon.js";

// Sentiment port
export type { SentimentScore, SentimentPort } from "./sentiment.js";
export { RuleBasedSentimentPort, createSentimentPort } from "./sentiment.js";

// Mitigation
export type { RewriteSuggestion, MitigationPort } from "./mitigation.js";
export {
  RuleBasedMitigationPort,
  createMitigationPort,
  generateMitigations,
} from "./mitigation.js";
