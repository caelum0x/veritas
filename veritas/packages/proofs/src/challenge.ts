// Fiat-Shamir-style non-interactive challenge derivation from a proof transcript.
import { sha256Hex } from "@veritas/crypto";
import { canonicalize } from "@veritas/core";

/** A named public input contributed to the challenge hash. */
export interface ChallengeInput {
  readonly label: string;
  readonly value: unknown;
}

/** A derived challenge scalar (hex string). */
export interface Challenge {
  readonly challenge: string;
  readonly inputs: readonly ChallengeInput[];
  readonly domainSeparator: string;
}

/**
 * Derive a Fiat-Shamir challenge by hashing a domain separator with ordered public inputs.
 * challenge = SHA-256(domainSeparator || canonicalize(inputs))
 */
export function deriveChallenge(
  domainSeparator: string,
  inputs: readonly ChallengeInput[],
): Challenge {
  const payload = canonicalize({ domainSeparator, inputs });
  const challenge = sha256Hex(payload);
  return { challenge, inputs, domainSeparator };
}

/**
 * Append an additional input to an existing challenge, re-deriving it.
 * Produces a new immutable Challenge rather than mutating the original.
 */
export function extendChallenge(
  prior: Challenge,
  newInput: ChallengeInput,
): Challenge {
  const extended = [...prior.inputs, newInput];
  return deriveChallenge(prior.domainSeparator, extended);
}

/**
 * Verify that a given challenge string matches what would be derived from the supplied inputs.
 */
export function verifyChallenge(candidate: Challenge): boolean {
  try {
    const derived = deriveChallenge(candidate.domainSeparator, candidate.inputs);
    return derived.challenge === candidate.challenge;
  } catch {
    return false;
  }
}
