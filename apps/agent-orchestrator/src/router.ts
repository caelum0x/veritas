// ClaimRouter: route claims to the most appropriate registered CAP agents based on topic.

import { ok, err } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { InternalError } from "@veritas/core";
import type { AgentCapability, AgentRegistry, ListAgentsFilter, RegistryEntry } from "./registry.js";

/** A claim paired with the list of agents chosen to verify it. */
export interface RoutedClaim {
  readonly claimText: string;
  readonly detectedCapability: AgentCapability;
  readonly assignedAgents: readonly RegistryEntry[];
}

/** Options for a routing pass. */
export interface RouterOptions {
  /**
   * Number of agents to assign per claim.
   * Use > 1 for redundancy / consensus (default 1).
   */
  readonly agentsPerClaim?: number;
  /** If provided, only pick agents whose capability matches a set of allowed values. */
  readonly capabilityHints?: readonly AgentCapability[];
  /** Maximum cost per claim in USDC micros — agents above this threshold are excluded. */
  readonly maxCostPerClaimUsdc?: number;
  /** Minimum trust score (0–1) to be considered for routing (default 0). */
  readonly minTrustScore?: number;
}

/** Keywords that map to non-general capability labels. */
const CAPABILITY_KEYWORDS: ReadonlyArray<{ keywords: readonly string[]; capability: AgentCapability }> =
  [
    { keywords: ["study", "research", "paper", "journal", "experiment", "hypothesis", "biology", "chemistry", "physics", "genome"], capability: "scientific" },
    { keywords: ["stock", "revenue", "gdp", "inflation", "market", "earnings", "fund", "ipo", "bond", "fiscal"], capability: "financial" },
    { keywords: ["law", "court", "statute", "regulation", "legal", "judgment", "litigation", "patent", "copyright", "treaty"], capability: "legal" },
    { keywords: ["drug", "vaccine", "clinical", "disease", "cancer", "therapy", "dose", "symptom", "diagnosis", "medication"], capability: "medical" },
    { keywords: ["election", "war", "sanctions", "government", "geopolitical", "president", "prime minister", "nato", "un resolution", "conflict"], capability: "geopolitical" },
    { keywords: ["software", "algorithm", "cybersecurity", "vulnerability", "api", "framework", "programming", "compiler", "network protocol", "encryption"], capability: "technical" },
  ];

/** Heuristically detect the most relevant capability for a claim. */
export function detectCapability(claimText: string): AgentCapability {
  const lower = claimText.toLowerCase();
  for (const { keywords, capability } of CAPABILITY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return capability;
    }
  }
  return "general";
}

/**
 * Route a list of claim texts to the best available CAP agents in the registry.
 * Agents are ranked by trustScore (descending) within the matched capability.
 * Falls back to "general" agents when no specialist is available.
 */
export function routeClaims(
  claims: readonly string[],
  registry: AgentRegistry,
  options: RouterOptions = {},
): Result<readonly RoutedClaim[], AppError> {
  const agentsPerClaim = options.agentsPerClaim ?? 1;

  if (claims.length === 0) {
    return ok([]);
  }

  const routed: RoutedClaim[] = [];

  for (const claimText of claims) {
    const detectedCapability = options.capabilityHints?.[0] ?? detectCapability(claimText);

    const filter: ListAgentsFilter = {
      healthyOnly: true,
      capability: detectedCapability,
      ...(options.maxCostPerClaimUsdc !== undefined
        ? { maxCostPerClaimUsdc: options.maxCostPerClaimUsdc }
        : {}),
      ...(options.minTrustScore !== undefined
        ? { minTrustScore: options.minTrustScore }
        : {}),
    };

    let candidates = registry.list(filter);

    // Fall back to general agents if no specialist is available.
    if (candidates.length === 0 && detectedCapability !== "general") {
      const fallbackFilter: ListAgentsFilter = {
        ...filter,
        capability: "general",
      };
      candidates = registry.list(fallbackFilter);
    }

    if (candidates.length === 0) {
      return err(
        new InternalError({
          message: `No healthy agents available to route claim: "${claimText.slice(0, 80)}..."`,
        }) as AppError,
      );
    }

    const assignedAgents = candidates.slice(0, agentsPerClaim);

    routed.push({
      claimText,
      detectedCapability,
      assignedAgents,
    });
  }

  return ok(routed);
}

/** Convenience: route a single claim. */
export function routeClaim(
  claimText: string,
  registry: AgentRegistry,
  options: RouterOptions = {},
): Result<RoutedClaim, AppError> {
  const result = routeClaims([claimText], registry, options);
  if (!result.ok) return result as unknown as Result<RoutedClaim, AppError>;
  const first = result.value[0];
  if (!first) {
    return err(
      new InternalError({ message: "routeClaim: no result returned" }) as AppError,
    );
  }
  return ok(first);
}
