// Taxonomy-specific error types extending the shared AppError hierarchy.
import { AppError } from "@veritas/core";

/** Claim text could not be classified into any known type or domain */
export class ClassificationError extends AppError {
  readonly kind = "ClassificationError" as const;
  readonly claimText: string;

  constructor(message: string, claimText: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.claimText = claimText;
  }
}

/** LLM classifier returned output that could not be parsed into a ClassificationResult */
export class ClassifierParseError extends AppError {
  readonly kind = "ClassifierParseError" as const;
  readonly rawOutput: string;

  constructor(message: string, rawOutput: string, cause?: unknown) {
    super("INTERNAL", 502, message, { cause });
    this.rawOutput = rawOutput;
  }
}

/** No verifier mapped to the given domain */
export class UnmappedDomainError extends AppError {
  readonly kind = "UnmappedDomainError" as const;
  readonly domain: string;

  constructor(domain: string) {
    super("NOT_FOUND", 404, `No verifier mapping found for domain "${domain}"`);
    this.domain = domain;
  }
}

/** Taxonomy node was not found in the registry */
export class TaxonomyNodeNotFoundError extends AppError {
  readonly kind = "TaxonomyNodeNotFoundError" as const;
  readonly nodeId: string;

  constructor(nodeId: string) {
    super("NOT_FOUND", 404, `Taxonomy node "${nodeId}" not found`);
    this.nodeId = nodeId;
  }
}
