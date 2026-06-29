// Domain normalization: strip protocol, www prefix, trailing slashes, and lowercase.

import { type Result, ok, err } from "@veritas/core";
import { InvalidDomainError } from "./errors.js";

const WWW_PREFIX = /^www\./i;
const TRAILING_SLASH = /\/+$/;

/**
 * Normalize a raw URL or domain string to a bare lowercase domain.
 * Returns Err(InvalidDomainError) if the value cannot produce a valid domain.
 */
export function normalizeDomain(raw: string): Result<string, InvalidDomainError> {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return err(new InvalidDomainError(raw));
  }

  // If it looks like a URL (has protocol), parse with URL API.
  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      candidate = parsed.hostname;
    } catch {
      return err(new InvalidDomainError(raw));
    }
  } else {
    // Strip trailing slashes and path segments if present.
    candidate = candidate.replace(TRAILING_SLASH, "").split("/")[0] ?? candidate;
  }

  const domain = candidate.toLowerCase().replace(WWW_PREFIX, "");

  if (!isValidDomain(domain)) {
    return err(new InvalidDomainError(raw));
  }

  return ok(domain);
}

/** Return true if the string looks like a plausible domain (has at least one dot, no spaces). */
function isValidDomain(domain: string): boolean {
  return (
    domain.length > 0 &&
    domain.includes(".") &&
    !/\s/.test(domain) &&
    !/^[\.\-]/.test(domain) &&
    !/[\.\-]$/.test(domain)
  );
}

/** Convenience: normalize or fall back to empty string (for contexts where Result is unwanted). */
export function normalizeDomainOrEmpty(raw: string): string {
  const result = normalizeDomain(raw);
  return result.ok ? result.value : "";
}
