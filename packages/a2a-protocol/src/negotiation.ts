// Capability negotiation: propose, accept, reject, and validate A2A capability agreements.

import { z } from "zod";
import { type Result, ok, err, ValidationError } from "@veritas/core";
import { type Skill } from "./skill.js";

/** A capability proposal sent from a buyer agent to a provider. */
export const CapabilityProposalSchema = z.object({
  /** Unique proposal id (buyer-generated). */
  proposalId: z.string().min(1),
  /** Skill ids the buyer wants to use. */
  skillIds: z.array(z.string().min(1)).min(1),
  /** Maximum price in USDC base units the buyer is willing to pay. */
  maxPriceUsdc: z.string().regex(/^\d+$/, "must be a decimal integer string"),
  /** ISO-8601 deadline by which the offer must be accepted. */
  expiresAt: z.string().datetime(),
  /** Arbitrary context passed to the provider (e.g. SLA requirements). */
  context: z.record(z.unknown()).optional(),
});
export type CapabilityProposal = z.infer<typeof CapabilityProposalSchema>;

/** Negotiation outcome returned by the provider. */
export type NegotiationOutcome =
  | { readonly status: "accepted"; readonly agreedPriceUsdc: string; readonly quoteHash: string }
  | { readonly status: "rejected"; readonly reason: string }
  | { readonly status: "countered"; readonly counterProposal: CapabilityProposal };

/** Validate that a proposal references only known skills. */
export function validateProposal(
  proposal: CapabilityProposal,
  available: ReadonlyMap<string, Skill>,
): Result<void> {
  const unknown = proposal.skillIds.filter((id) => !available.has(id));
  if (unknown.length > 0) {
    return err(
      new ValidationError({
        message: `Unknown skill ids: ${unknown.join(", ")}`,
        details: { unknownIds: unknown },
      }),
    );
  }
  return ok(undefined);
}

/** Accept a proposal, producing an outcome with a deterministic quote hash. */
export function acceptProposal(
  proposal: CapabilityProposal,
  agreedPriceUsdc: string,
  hashFn: (input: string) => string,
): NegotiationOutcome {
  const payload = `${proposal.proposalId}:${agreedPriceUsdc}:${proposal.expiresAt}`;
  return {
    status: "accepted",
    agreedPriceUsdc,
    quoteHash: hashFn(payload),
  };
}

/** Reject a proposal with a human-readable reason. */
export function rejectProposal(reason: string): NegotiationOutcome {
  return { status: "rejected", reason };
}

/** Counter a proposal with revised terms. */
export function counterProposal(
  counter: CapabilityProposal,
): NegotiationOutcome {
  return { status: "countered", counterProposal: counter };
}
