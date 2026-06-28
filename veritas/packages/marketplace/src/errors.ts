// Marketplace-specific error classes extending the platform AppError hierarchy.

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when a listing cannot be found by id or slug. */
export class ListingNotFoundError extends AppError {
  constructor(id: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Listing not found: ${id}`, {
      ...options,
      details: { listingId: id, ...options.details },
    });
  }
}

/** Raised when a listing with the same slug already exists. */
export class ListingConflictError extends AppError {
  constructor(slug: string, options: AppErrorOptions = {}) {
    super("CONFLICT", 409, `Listing already exists with slug: ${slug}`, {
      ...options,
      details: { slug, ...options.details },
    });
  }
}

/** Raised when a listing fails marketplace validation rules. */
export class ListingValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION", 422, message, options);
  }
}

/** Raised when a listing is in a state that prevents the operation. */
export class ListingStateError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("CONFLICT", 409, message, options);
  }
}

/** Raised when a caller lacks permission to act on a listing. */
export class ListingForbiddenError extends AppError {
  constructor(message = "Forbidden", options: AppErrorOptions = {}) {
    super("FORBIDDEN", 403, message, options);
  }
}

/** Raised when moderation review is required before an action proceeds. */
export class ModerationRequiredError extends AppError {
  constructor(listingId: string, options: AppErrorOptions = {}) {
    super(
      "FORBIDDEN",
      403,
      `Listing ${listingId} is pending moderation review`,
      { ...options, details: { listingId, ...options.details } },
    );
  }
}

/** Raised when a category is not found. */
export class CategoryNotFoundError extends AppError {
  constructor(id: string, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Category not found: ${id}`, {
      ...options,
      details: { categoryId: id, ...options.details },
    });
  }
}
