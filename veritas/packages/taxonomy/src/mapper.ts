// Maps taxonomy domains to verifier identifiers and data-source port names.

import { Domain } from "./domain.js";
import { ClaimType } from "./claim-type.js";

/** Identifier for a specialized verifier registered in the verifier registry. */
export type VerifierId = string;

/** Identifier for a data-source port (e.g. EDGAR, PubMed). */
export type DataSourceId = string;

/** The mapping record for a single domain. */
export interface DomainMapping {
  readonly domain: Domain;
  /** Primary verifier for this domain. */
  readonly primaryVerifier: VerifierId;
  /** Fallback verifiers in priority order. */
  readonly fallbackVerifiers: readonly VerifierId[];
  /** Data sources required by this domain's verifiers. */
  readonly dataSources: readonly DataSourceId[];
  /** Whether LLM-backed fallback is allowed for this domain. */
  readonly allowLlmFallback: boolean;
}

/** Full domain-to-verifier mapping table. */
export const DOMAIN_MAPPINGS: Readonly<Record<Domain, DomainMapping>> = {
  [Domain.Financial]: {
    domain: Domain.Financial,
    primaryVerifier: "verifiers-financial",
    fallbackVerifiers: ["verifiers-news"],
    dataSources: ["edgar", "news-api"],
    allowLlmFallback: true,
  },
  [Domain.Scientific]: {
    domain: Domain.Scientific,
    primaryVerifier: "verifiers-scientific",
    fallbackVerifiers: [],
    dataSources: ["pubmed", "crossref"],
    allowLlmFallback: false,
  },
  [Domain.Medical]: {
    domain: Domain.Medical,
    primaryVerifier: "verifiers-medical",
    fallbackVerifiers: ["verifiers-scientific"],
    dataSources: ["pubmed", "clinical-trials"],
    allowLlmFallback: false,
  },
  [Domain.News]: {
    domain: Domain.News,
    primaryVerifier: "verifiers-news",
    fallbackVerifiers: [],
    dataSources: ["news-api"],
    allowLlmFallback: true,
  },
  [Domain.Crypto]: {
    domain: Domain.Crypto,
    primaryVerifier: "verifiers-crypto",
    fallbackVerifiers: [],
    dataSources: ["on-chain", "news-api"],
    allowLlmFallback: true,
  },
  [Domain.Legal]: {
    domain: Domain.Legal,
    primaryVerifier: "verifiers-legal",
    fallbackVerifiers: [],
    dataSources: ["legal-db"],
    allowLlmFallback: false,
  },
  [Domain.General]: {
    domain: Domain.General,
    primaryVerifier: "verifiers-news",
    fallbackVerifiers: [],
    dataSources: [],
    allowLlmFallback: true,
  },
} as const;

/** Claim-type priority weights used to order multiple verifiers. */
export const CLAIM_TYPE_VERIFIER_WEIGHTS: Readonly<
  Record<ClaimType, Readonly<Partial<Record<VerifierId, number>>>>
> = {
  [ClaimType.Statistical]: {
    "verifiers-financial": 1.2,
    "verifiers-scientific": 1.1,
    "verifiers-medical": 1.1,
  },
  [ClaimType.Causal]: {
    "verifiers-scientific": 1.3,
    "verifiers-medical": 1.2,
  },
  [ClaimType.Definitional]: {},
  [ClaimType.Predictive]: {
    "verifiers-financial": 1.1,
  },
  [ClaimType.Quote]: {
    "verifiers-news": 1.3,
  },
  [ClaimType.Event]: {
    "verifiers-news": 1.2,
    "verifiers-crypto": 1.1,
  },
  [ClaimType.Comparative]: {
    "verifiers-financial": 1.1,
    "verifiers-scientific": 1.1,
  },
} as const;

/** Resolve verifier ids for a domain, ordered by priority. */
export function resolveVerifiers(domain: Domain): readonly VerifierId[] {
  const mapping = DOMAIN_MAPPINGS[domain];
  return [mapping.primaryVerifier, ...mapping.fallbackVerifiers];
}

/** Resolve data sources required for a domain. */
export function resolveDataSources(domain: Domain): readonly DataSourceId[] {
  return DOMAIN_MAPPINGS[domain].dataSources;
}

/** Weight a verifier id given claim type context (defaults to 1.0). */
export function verifierWeight(
  claimType: ClaimType,
  verifierId: VerifierId,
): number {
  const weights = CLAIM_TYPE_VERIFIER_WEIGHTS[claimType];
  return (weights as Record<string, number>)[verifierId] ?? 1.0;
}

/** Get the full domain mapping record. */
export function domainMapping(domain: Domain): DomainMapping {
  return DOMAIN_MAPPINGS[domain];
}
