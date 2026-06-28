// Option<T>: an explicit optional value (Some | None).

export interface Some<T> {
  readonly some: true;
  readonly value: T;
}

export interface None {
  readonly some: false;
}

export type Option<T> = Some<T> | None;

const NONE: None = { some: false };

/** Wrap a present value. */
export function some<T>(value: T): Some<T> {
  return { some: true, value };
}

/** The empty option. */
export function none(): None {
  return NONE;
}

/** Lift a nullable value into an Option. */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value === null || value === undefined ? NONE : some(value);
}

/** Type guard: does this option hold a value? */
export function isSome<T>(o: Option<T>): o is Some<T> {
  return o.some;
}

/** Type guard: is this option empty? */
export function isNone<T>(o: Option<T>): o is None {
  return !o.some;
}

/** Map the contained value if present. */
export function mapOption<T, U>(o: Option<T>, fn: (value: T) => U): Option<U> {
  return o.some ? some(fn(o.value)) : NONE;
}

/** Extract the value or return a fallback. */
export function getOr<T>(o: Option<T>, fallback: T): T {
  return o.some ? o.value : fallback;
}

/** Convert an Option back to a nullable value. */
export function toNullable<T>(o: Option<T>): T | null {
  return o.some ? o.value : null;
}
