// Common string utilities.

/** Truncate to `max` chars, appending an ellipsis when shortened. */
export function truncate(value: string, max: number, ellipsis = "…"): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - ellipsis.length)) + ellipsis;
}

/** Capitalize the first character. */
export function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/** Collapse runs of whitespace into single spaces and trim. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** True when the string is empty or only whitespace. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/** Ensure the string ends with `suffix`, appending if needed. */
export function ensureSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value : value + suffix;
}
