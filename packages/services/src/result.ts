// Service result helpers: lifts thrown AppErrors into typed Results.
import {
  Result,
  ok,
  err,
  AppError,
  InternalError,
  tryAsync,
  trySync,
} from "@veritas/core";

/**
 * Execute an async service operation and wrap the outcome in a Result.
 * AppError subclasses are preserved; unknown errors become InternalError.
 */
export async function serviceCall<T>(
  fn: () => Promise<T>,
): Promise<Result<T, AppError>> {
  const result = await tryAsync(fn);
  if (result.ok) return ok(result.value);
  const cause = result.error;
  if (cause instanceof AppError) return err(cause);
  return err(new InternalError({ message: "Unexpected service error", cause }));
}

/**
 * Execute a synchronous service operation and wrap the outcome in a Result.
 * AppError subclasses are preserved; unknown errors become InternalError.
 */
export function serviceCallSync<T>(
  fn: () => T,
): Result<T, AppError> {
  const result = trySync(fn);
  if (result.ok) return ok(result.value);
  const cause = result.error;
  if (cause instanceof AppError) return err(cause);
  return err(new InternalError({ message: "Unexpected service error", cause }));
}

/**
 * Combine multiple Results, collecting all errors.
 * Returns ok(values[]) when all succeed, or the first err encountered.
 */
export function combineResults<T>(
  results: ReadonlyArray<Result<T, AppError>>,
): Result<ReadonlyArray<T>, AppError> {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return err(r.error);
    values.push(r.value);
  }
  return ok(values);
}

/**
 * Assert a condition and return an error Result if it fails.
 * Useful for business-rule guards inside service methods.
 */
export function guard(
  condition: boolean,
  error: AppError,
): Result<true, AppError> {
  return condition ? ok(true as const) : err(error);
}

export { ok, err, Result, AppError };
