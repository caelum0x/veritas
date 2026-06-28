// Shared type definitions for the multilingual package
import { type Result } from "@veritas/core";
import { type LanguageCode, type LocaleTag } from "./language.js";
import { type ScriptCode } from "./script.js";
import { type MultilingualError } from "./errors.js";
import { type DetectionResult } from "./detector.js";
import { type NormalizationForm, type NormalizeOptions } from "./normalize.js";

/** A piece of text with an associated language code */
export interface LanguageTaggedText {
  readonly text: string;
  readonly language: LanguageCode;
}

/** Translation request from a source language to a target language */
export interface TranslationRequest {
  readonly text: string;
  readonly sourceLanguage: LanguageCode;
  readonly targetLanguage: LanguageCode;
  /** Optional context hint to improve translation quality */
  readonly context?: string;
}

/** Translation result including metadata */
export interface TranslationResult {
  readonly originalText: string;
  readonly translatedText: string;
  readonly sourceLanguage: LanguageCode;
  readonly targetLanguage: LanguageCode;
  /** Confidence score between 0 and 1 */
  readonly confidence: number;
  /** Model or engine that produced the translation */
  readonly provider: string;
}

/** Cross-lingual verification alignment result */
export interface CrossLingualAlignment {
  readonly claim: LanguageTaggedText;
  readonly normalizedClaim: string;
  readonly detectedLanguage: LanguageCode;
  readonly script: ScriptCode;
  readonly isRtl: boolean;
  readonly translatedToEnglish?: TranslationResult;
}

/** Source language match result for provenance checking */
export interface SourceLanguageMatch {
  readonly sourceLanguage: LanguageCode;
  readonly claimLanguage: LanguageCode;
  readonly languagesMatch: boolean;
  readonly scriptMatch: boolean;
  readonly requiresTranslation: boolean;
}

/** Locale-aware formatting options */
export interface LocaleFormatOptions {
  readonly locale: LocaleTag;
  readonly numberStyle?: "decimal" | "percent" | "currency";
  readonly dateStyle?: "short" | "medium" | "long" | "full";
  readonly timeStyle?: "short" | "medium" | "long" | "full";
}

/** Result of locale-aware text processing */
export interface LocaleProcessedText {
  readonly original: string;
  readonly normalized: string;
  readonly locale: LocaleTag;
  readonly language: LanguageCode;
  readonly script: ScriptCode;
  readonly direction: "ltr" | "rtl" | "ttb" | "mixed";
}

/** Port interface for translation providers */
export interface TranslatorPort {
  readonly name: string;
  translate(request: TranslationRequest): Promise<Result<TranslationResult, MultilingualError>>;
  supportsLanguagePair(source: LanguageCode, target: LanguageCode): boolean;
}

/** Multilingual processing pipeline configuration */
export interface MultilingualConfig {
  readonly defaultTargetLanguage: LanguageCode;
  readonly translationProvider?: TranslatorPort;
  readonly normalizationOptions?: NormalizeOptions;
  readonly detectionMinConfidence?: number;
}

/** Summary of multilingual analysis for a claim */
export interface MultilingualAnalysis {
  readonly detection: DetectionResult;
  readonly script: ScriptCode;
  readonly isRtl: boolean;
  readonly normalizationForm: NormalizationForm;
  readonly alignment?: CrossLingualAlignment;
}

export type {
  NormalizationForm,
  NormalizeOptions,
  DetectionResult,
  LanguageCode,
  LocaleTag,
  ScriptCode,
  MultilingualError,
};
