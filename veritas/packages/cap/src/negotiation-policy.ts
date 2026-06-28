// Policy logic for accepting or rejecting incoming CAP negotiations.

import type { ParsedRequirements } from "./types.js";
import { Usdc } from "@veritas/core";

/** Constraints used to evaluate whether a negotiation should be accepted. */
export interface NegotiationPolicyConfig {
  /** Minimum acceptable USDC amount (decimal string, e.g. "1.00"). */
  readonly minAmountUsdc: string;
  /** Maximum claims allowed in a single order. */
  readonly maxClaims: number;
  /** Allowed effort levels. */
  readonly allowedEfforts: ReadonlyArray<"low" | "standard" | "high">;
  /** Optional allowlist of buyer IDs; if empty all buyers are accepted. */
  readonly allowedBuyerIds?: ReadonlyArray<string>;
}

/** Result of evaluating a negotiation against the policy. */
export type PolicyDecision =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly reason: string };

/** Default policy configuration for the Veritas CAP provider. */
export const DEFAULT_POLICY_CONFIG: NegotiationPolicyConfig = {
  minAmountUsdc: "0.50",
  maxClaims: 50,
  allowedEfforts: ["low", "standard", "high"],
};

/**
 * Evaluates a parsed negotiation request against the configured policy.
 * Returns an accepted or rejected decision with a human-readable reason.
 */
export function evaluateNegotiation(
  requirements: ParsedRequirements,
  offeredAmountUsdc: string,
  buyerId: string,
  config: NegotiationPolicyConfig = DEFAULT_POLICY_CONFIG
): PolicyDecision {
  // Check buyer allowlist
  if (
    config.allowedBuyerIds !== undefined &&
    config.allowedBuyerIds.length > 0 &&
    !config.allowedBuyerIds.includes(buyerId)
  ) {
    return { accepted: false, reason: `Buyer '${buyerId}' is not on the allowlist.` };
  }

  // Check effort level
  if (!config.allowedEfforts.includes(requirements.effort)) {
    return {
      accepted: false,
      reason: `Effort level '${requirements.effort}' is not supported by this provider.`,
    };
  }

  // Check claim count
  const claimCount = requirements.claims?.length ?? 0;
  if (claimCount > config.maxClaims) {
    return {
      accepted: false,
      reason: `Request contains ${claimCount} claims; maximum allowed is ${config.maxClaims}.`,
    };
  }

  if (requirements.maxClaims !== undefined && requirements.maxClaims > config.maxClaims) {
    return {
      accepted: false,
      reason: `Requested maxClaims ${requirements.maxClaims} exceeds provider limit of ${config.maxClaims}.`,
    };
  }

  // Check minimum amount
  const offered = Usdc.fromDecimalString(offeredAmountUsdc);
  const minimum = Usdc.fromDecimalString(config.minAmountUsdc);
  if (offered.compare(minimum) < 0) {
    return {
      accepted: false,
      reason: `Offered amount ${offeredAmountUsdc} USDC is below minimum ${config.minAmountUsdc} USDC.`,
    };
  }

  return { accepted: true };
}
