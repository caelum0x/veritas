// Cache-specific error types extending base AppError patterns.
export class CacheError extends Error {
  readonly code: string;
  constructor(message: string, code = "CACHE_ERROR") {
    super(message);
    this.name = "CacheError";
    this.code = code;
  }
}

export class CacheSerializationError extends CacheError {
  constructor(message: string) {
    super(message, "CACHE_SERIALIZATION_ERROR");
    this.name = "CacheSerializationError";
  }
}

export class CacheCapacityError extends CacheError {
  constructor(message: string) {
    super(message, "CACHE_CAPACITY_ERROR");
    this.name = "CacheCapacityError";
  }
}

export class CacheKeyError extends CacheError {
  constructor(message: string) {
    super(message, "CACHE_KEY_ERROR");
    this.name = "CacheKeyError";
  }
}

export function isCacheError(value: unknown): value is CacheError {
  return value instanceof CacheError;
}
