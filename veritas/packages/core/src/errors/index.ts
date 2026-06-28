// Barrel re-exporting the error hierarchy and a normalization helper.

export {
  AppError,
  isAppError,
  type AppErrorOptions,
  type ErrorCode,
  type ErrorDetails,
} from "./base-error.js";
export { NotFoundError } from "./not-found-error.js";
export { ConflictError } from "./conflict-error.js";
export { ValidationError, type FieldIssue } from "./validation-error.js";
export { UnauthorizedError } from "./unauthorized-error.js";
export { ForbiddenError } from "./forbidden-error.js";
export { RateLimitedError } from "./rate-limited-error.js";
export { UnavailableError } from "./unavailable-error.js";
export { InternalError } from "./internal-error.js";

import { AppError } from "./base-error.js";
import { InternalError } from "./internal-error.js";

/** Coerce any thrown value into a known AppError (defaults to InternalError). */
export function toAppError(value: unknown): AppError {
  if (value instanceof AppError) return value;
  return InternalError.wrap(value, value instanceof Error ? value.message : undefined);
}
