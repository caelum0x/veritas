// Public surface of @veritas/multilingual — re-exports all modules
export {
  LanguageCodeSchema,
  LocaleTagSchema,
  SUPPORTED_LANGUAGES,
  UNKNOWN_LANGUAGE,
  getLanguageMeta,
  isSupportedLanguage,
  isRtl,
} from "./language.js";
export type { LanguageCode, LocaleTag, LanguageMeta } from "./language.js";

export {
  detectLanguage,
  detectLanguageWithThreshold,
  detectLanguageCode,
} from "./detector.js";
export type { DetectionResult } from "./detector.js";

export {
  normalizeText,
  toNFC,
  toNFD,
  toNFKC,
  stripDiacritics,
  normalizeForComparison,
  areEquivalent,
  removeInvisibleChars,
  normalizeLineEndings,
} from "./normalize.js";
export type { NormalizationForm, NormalizeOptions } from "./normalize.js";

export {
  detectScript,
  getScriptInfo,
  isRtlScript,
  isRtlText,
} from "./script.js";
export type { ScriptCode, ScriptInfo } from "./script.js";

export {
  MultilingualError,
  detectionError,
  translationError,
  unsupportedLanguageError,
  crossLingualError,
  normalizationError,
} from "./errors.js";
export type { MultilingualErrorCode } from "./errors.js";

export type {
  LanguageTaggedText,
  TranslationRequest,
  TranslationResult,
  CrossLingualAlignment,
  SourceLanguageMatch,
  LocaleFormatOptions,
  LocaleProcessedText,
  TranslatorPort,
  MultilingualConfig,
  MultilingualAnalysis,
} from "./types.js";
