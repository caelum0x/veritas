// Runtime type guards for narrowing unknown values.

/** Is the value a non-null object (and not an array)? */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Is the value a string? */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Is the value a finite number? */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Is the value a boolean? */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Is the value an array? */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Is the value a function? */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/** Is the value null or undefined? */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Is the value defined (not null/undefined)? Useful for array filtering. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Does the object have an own property with the given key? */
export function hasKey<K extends string>(
  value: unknown,
  key: K,
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}
