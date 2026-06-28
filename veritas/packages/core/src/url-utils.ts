// URL parsing and normalization helpers used for source provenance.

import { err, ok, type Result } from "./result.js";

/** Parse a string into a URL, returning a Result instead of throwing. */
export function parseUrl(value: string): Result<URL, Error> {
  try {
    return ok(new URL(value));
  } catch {
    return err(new Error(`Invalid URL: ${value}`));
  }
}

/** Extract the registrable host (lowercased), or null if invalid. */
export function hostOf(value: string): string | null {
  const parsed = parseUrl(value);
  return parsed.ok ? parsed.value.host.toLowerCase() : null;
}

/**
 * Normalize a URL for stable comparison: lowercase host, drop default ports,
 * strip trailing slash on the path, and remove the fragment.
 */
export function normalizeUrl(value: string): string | null {
  const parsed = parseUrl(value);
  if (!parsed.ok) return null;
  const u = parsed.value;
  u.host = u.host.toLowerCase();
  u.hash = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }
  return u.toString();
}

/** True if the URL uses http or https. */
export function isHttpUrl(value: string): boolean {
  const parsed = parseUrl(value);
  return parsed.ok && (parsed.value.protocol === "http:" || parsed.value.protocol === "https:");
}
