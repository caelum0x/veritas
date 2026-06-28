// Claim pair: two claims to be compared for contradiction or entailment.
import { newId } from "@veritas/core";
import type { NliScore } from "./relation.js";

export interface ClaimText {
  readonly id: string;
  readonly text: string;
  readonly sourceId?: string;
}

export interface ClaimPair {
  readonly pairId: string;
  readonly premise: ClaimText;
  readonly hypothesis: ClaimText;
  /** Populated after NLI inference */
  readonly nliScore?: NliScore;
}

export function makePair(
  premise: ClaimText,
  hypothesis: ClaimText,
): ClaimPair {
  return {
    pairId: newId("pair"),
    premise,
    hypothesis,
  };
}

export function withScore(pair: ClaimPair, nliScore: NliScore): ClaimPair {
  return { ...pair, nliScore };
}
