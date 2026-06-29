// Claim type enum representing the logical/rhetorical category of a verifiable claim.
export enum ClaimType {
  Statistical = "statistical",
  Causal = "causal",
  Definitional = "definitional",
  Predictive = "predictive",
  Quote = "quote",
  Event = "event",
  Comparative = "comparative",
}

export const CLAIM_TYPES = Object.values(ClaimType) as ClaimType[];

export function isClaimType(value: unknown): value is ClaimType {
  return typeof value === "string" && CLAIM_TYPES.includes(value as ClaimType);
}
