// Core stance enumeration: support / oppose / neutral alignment of a source to a claim
import { z } from "zod";

export const StanceSchema = z.enum(["supports", "opposes", "neutral"]);
export type Stance = z.infer<typeof StanceSchema>;

/** Convert EvidenceStance (from @veritas/contracts) to Stance */
export function fromEvidenceStance(raw: "supports" | "refutes" | "neutral"): Stance {
  switch (raw) {
    case "supports": return "supports";
    case "refutes":  return "opposes";
    case "neutral":  return "neutral";
  }
}

/** Invert a stance (opposite perspective) */
export function invertStance(stance: Stance): Stance {
  switch (stance) {
    case "supports": return "opposes";
    case "opposes":  return "supports";
    case "neutral":  return "neutral";
  }
}

/** Numeric projection: supports=+1, neutral=0, opposes=-1 */
export function stanceToNumber(stance: Stance): number {
  switch (stance) {
    case "supports": return  1;
    case "opposes":  return -1;
    case "neutral":  return  0;
  }
}

/** Recover stance from numeric projection */
export function numberToStance(n: number): Stance {
  if (n > 0.15)  return "supports";
  if (n < -0.15) return "opposes";
  return "neutral";
}
