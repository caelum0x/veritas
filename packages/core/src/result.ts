// Result<T,E>: explicit success/failure values without exceptions.

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = unknown> = Ok<T> | Err<E>;

/** Construct a success result. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Construct a failure result. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Type guard: is this result a success? */
export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok;
}

/** Type guard: is this result a failure? */
export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return !r.ok;
}

/** Map the success value, leaving errors untouched. */
export function map<T, E, U>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

/** Map the error value, leaving successes untouched. */
export function mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return r.ok ? r : err(fn(r.error));
}

/** Chain a fallible operation onto a success. */
export function flatMap<T, E, U>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return r.ok ? fn(r.value) : r;
}

/** Extract the value or throw if the result is an error. */
export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error instanceof Error ? r.error : new Error(String(r.error));
}

/** Extract the value or return a fallback on error. */
export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback;
}
