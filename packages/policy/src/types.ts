// Shared domain types for the policy engine (fact maps, eval context shapes, etc.)
import type { Verdict } from '@veritas/core';

/** Arbitrary key-value fact bag passed into policy evaluation. */
export type Facts = Readonly<Record<string, unknown>>;

/** Principal identity present in evaluation context. */
export interface PolicyPrincipal {
  readonly userId: string;
  readonly orgId?: string;
  readonly roles: ReadonlyArray<string>;
}

/** Metadata attached to a policy evaluation request. */
export interface EvalMeta {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly callerService?: string;
  readonly timestamp: string;
}

/** Verification-specific fact shape used by verification rules. */
export interface VerificationFacts {
  readonly claimId: string;
  readonly jobId?: string;
  readonly confidenceScore: number;
  readonly verdict?: Verdict;
  readonly sourceTier?: string;
  readonly sourceCount: number;
  readonly modelId?: string;
  readonly contentLengthChars?: number;
  readonly hasConflictingEvidence?: boolean;
  readonly requiredReviewThreshold?: number;
  readonly escalationTierOverride?: string;
  readonly [key: string]: unknown;
}

/** Supported policy combination strategies. */
export type CombinationStrategy = 'first-applicable' | 'deny-overrides' | 'allow-overrides' | 'unanimous';

/** Lightweight policy reference (id + version) for audit trails. */
export interface PolicyRef {
  readonly policyId: string;
  readonly version: number;
}
