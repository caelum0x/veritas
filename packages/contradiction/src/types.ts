// types.ts: shared domain types for the contradiction detection module.
import { z } from "zod";
import type { ClaimText } from "./pair.js";
import type { NliRelation, NliScore } from "./relation.js";
import type { ContradictionCluster } from "./cluster.js";

/** Severity level of a detected contradiction. */
export type ContradictionSeverity = "low" | "medium" | "high" | "critical";

/** Status of a contradiction record in the system. */
export type ContradictionStatus = "open" | "investigating" | "resolved" | "dismissed";

/** A detected contradiction between two claims. */
export interface Contradiction {
  readonly id: string;
  readonly premise: ClaimText;
  readonly hypothesis: ClaimText;
  readonly nliScore: NliScore;
  readonly severity: ContradictionSeverity;
  readonly status: ContradictionStatus;
  readonly explanation?: string;
  readonly detectedAt: string;
  readonly resolvedAt?: string;
}

/** Context passed to detector and verifier routines. */
export interface DetectionContext {
  readonly requestId?: string;
  readonly signal?: AbortSignal;
  readonly contradictionThreshold?: number;
  readonly maxPairs?: number;
}

/** Result summary from a full detection run. */
export interface DetectionResult {
  readonly totalPairs: number;
  readonly contradictionsFound: number;
  readonly contradictions: ReadonlyArray<Contradiction>;
  readonly clusters: ReadonlyArray<ContradictionCluster>;
}

/** Explanation for a single contradiction. */
export interface ContradictionExplanation {
  readonly contradictionId: string;
  readonly premise: string;
  readonly hypothesis: string;
  readonly relation: NliRelation;
  readonly confidence: number;
  readonly reasoning: string;
  readonly severity: ContradictionSeverity;
}

export const contradictionSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const contradictionStatusSchema = z.enum(["open", "investigating", "resolved", "dismissed"]);
