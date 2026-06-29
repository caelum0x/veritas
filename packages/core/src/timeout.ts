// Promise timeout helper that rejects with UnavailableError on expiry.

import { UnavailableError } from "./errors/unavailable-error.js";

/**
 * Race a promise against a timeout. If `ms` elapses first, reject with an
 * UnavailableError. The original promise is not cancelled (JS limitation).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(UnavailableError.of(label, `timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
