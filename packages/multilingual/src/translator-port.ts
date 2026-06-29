// Port interface for translation services — implementations inject concrete providers
import { z } from "zod";
import { type Result } from "@veritas/core";
import { type LanguageCode, LanguageCodeSchema } from "./language.js";
import { type MultilingualError } from "./errors.js";

export const TranslationRequestSchema = z.object({
  text: z.string().min(1).max(50_000),
  sourceLanguage: LanguageCodeSchema.optional(),
  targetLanguage: LanguageCodeSchema,
  preserveFormatting: z.boolean().default(false),
  domain: z.enum(["general", "news", "scientific", "legal", "financial"]).default("general"),
});
export type TranslationRequest = z.infer<typeof TranslationRequestSchema>;

export interface TranslationResult {
  readonly translatedText: string;
  readonly detectedSourceLanguage: LanguageCode | null;
  readonly confidence: number;
  readonly tokensUsed?: number;
}

/** Immutable translation cache entry */
export interface TranslationCacheEntry {
  readonly key: string;
  readonly result: TranslationResult;
  readonly createdAt: number;
}

/** Port interface every translation backend must satisfy */
export interface TranslatorPort {
  /** Translate text from source (or auto-detect) to target language */
  translate(request: TranslationRequest): Promise<Result<TranslationResult, MultilingualError>>;

  /** Batch translate — implementations may parallelise internally */
  translateBatch(
    requests: ReadonlyArray<TranslationRequest>,
  ): Promise<ReadonlyArray<Result<TranslationResult, MultilingualError>>>;

  /** Returns true if this translator supports the given language pair */
  supportsLanguagePair(source: LanguageCode, target: LanguageCode): boolean;
}

/** Build a deterministic cache key for a translation request */
export function buildCacheKey(request: TranslationRequest): string {
  const src = request.sourceLanguage ?? "auto";
  return `${src}:${request.targetLanguage}:${request.domain}:${request.text.slice(0, 64)}`;
}
