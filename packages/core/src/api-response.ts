// Standard API response envelope used across REST/SDK boundaries.

import type { ErrorCode, ErrorDetails } from "./errors/base-error.js";

/** Error body included in a failed API response. */
export interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: ErrorDetails;
}

/** A successful API response carrying a data payload. */
export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
}

/** A failed API response carrying an error and null data. */
export interface ApiFailure {
  readonly success: false;
  readonly data: null;
  readonly error: ApiError;
}

/** The discriminated union of all API responses. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Wrap a payload in a success envelope. */
export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data, error: null };
}

/** Wrap an error in a failure envelope. */
export function apiFailure(error: ApiError): ApiFailure {
  return { success: false, data: null, error };
}

/** Pagination metadata for list responses. */
export interface PageMeta {
  readonly total?: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/** A success envelope augmented with pagination metadata. */
export interface ApiPage<T> extends ApiSuccess<readonly T[]> {
  readonly meta: PageMeta;
}

/** Build a paginated success envelope. */
export function apiPage<T>(items: readonly T[], meta: PageMeta): ApiPage<T> {
  return { success: true, data: items, error: null, meta };
}
