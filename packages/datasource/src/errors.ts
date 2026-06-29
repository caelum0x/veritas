// Datasource-specific error types extending AppError hierarchy.

import { AppError } from "@veritas/core";
import type { AppErrorOptions } from "@veritas/core";

/** Thrown when a source domain is on the blocklist and cannot be imported or registered. */
export class BlocklistedDomainError extends AppError {
  readonly subCode = "BLOCKLISTED_DOMAIN" as const;

  constructor(domain: string, options?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Domain "${domain}" is on the blocklist and cannot be used as a source.`,
      options,
    );
    this.name = "BlocklistedDomainError";
  }
}

/** Thrown when a domain fails normalization (e.g., empty, unparseable). */
export class InvalidDomainError extends AppError {
  readonly subCode = "INVALID_DOMAIN" as const;

  constructor(raw: string, options?: Partial<AppErrorOptions>) {
    super(
      "VALIDATION",
      422,
      `Cannot normalize domain from value: "${raw}"`,
      options,
    );
    this.name = "InvalidDomainError";
  }
}

/** Thrown when a source with the given URL already exists in the store. */
export class DuplicateSourceError extends AppError {
  readonly subCode = "DUPLICATE_SOURCE" as const;

  constructor(url: string, options?: Partial<AppErrorOptions>) {
    super(
      "CONFLICT",
      409,
      `A source with URL "${url}" already exists.`,
      options,
    );
    this.name = "DuplicateSourceError";
  }
}

/** Thrown when seed data fails to load or parse. */
export class SeedError extends AppError {
  readonly subCode = "SEED_ERROR" as const;

  constructor(detail: string, options?: Partial<AppErrorOptions>) {
    super(
      "INTERNAL",
      500,
      `Datasource seed failed: ${detail}`,
      options,
    );
    this.name = "SeedError";
  }
}
