// Error types for the multilingual package
import { AppError } from "@veritas/core";

export type MultilingualErrorCode =
  | "DETECTION_FAILED"
  | "TRANSLATION_FAILED"
  | "UNSUPPORTED_LANGUAGE"
  | "CROSS_LINGUAL_FAILED"
  | "NORMALIZATION_FAILED";

export class MultilingualError extends AppError {
  readonly multilingual = true;
  constructor(
    readonly mlCode: MultilingualErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super("INTERNAL", 500, message, { cause });
  }
}

export function detectionError(message: string, cause?: unknown): MultilingualError {
  return new MultilingualError("DETECTION_FAILED", message, cause);
}

export function translationError(message: string, cause?: unknown): MultilingualError {
  return new MultilingualError("TRANSLATION_FAILED", message, cause);
}

export function unsupportedLanguageError(lang: string): MultilingualError {
  return new MultilingualError("UNSUPPORTED_LANGUAGE", `Language not supported: ${lang}`);
}

export function crossLingualError(message: string, cause?: unknown): MultilingualError {
  return new MultilingualError("CROSS_LINGUAL_FAILED", message, cause);
}

export function normalizationError(message: string, cause?: unknown): MultilingualError {
  return new MultilingualError("NORMALIZATION_FAILED", message, cause);
}
