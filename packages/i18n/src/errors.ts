// i18n-specific error types extending AppError for locale/catalog/translation failures
import { AppError, type AppErrorOptions } from "@veritas/core";

export class LocaleNotFoundError extends AppError {
  constructor(locale: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Locale not found: ${locale}`, options);
    this.name = "LocaleNotFoundError";
  }
}

export class MessageKeyNotFoundError extends AppError {
  constructor(key: string, locale: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Message key "${key}" not found for locale "${locale}"`, options);
    this.name = "MessageKeyNotFoundError";
  }
}

export class CatalogLoadError extends AppError {
  constructor(locale: string, cause?: unknown, options?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `Failed to load catalog for locale "${locale}"`, {
      ...options,
      cause: cause instanceof Error ? cause : undefined,
    });
    this.name = "CatalogLoadError";
  }
}

export class InvalidLocaleError extends AppError {
  constructor(locale: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Invalid locale tag: "${locale}"`, options);
    this.name = "InvalidLocaleError";
  }
}

export class InterpolationError extends AppError {
  constructor(key: string, detail: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Interpolation failed for key "${key}": ${detail}`, options);
    this.name = "InterpolationError";
  }
}
