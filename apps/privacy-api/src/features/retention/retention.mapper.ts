// Maps retention domain objects to HTTP response shapes.

import type { RetentionPolicy, LegalHold, ExpiryEvaluation } from "@veritas/retention";

export interface PolicyResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly retentionDays: number;
  readonly action: string;
  readonly legalHoldEligible: boolean;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LegalHoldResponse {
  readonly id: string;
  readonly reason: string;
  readonly placedBy: string;
  readonly status: string;
  readonly categories: readonly string[];
  readonly recordIds: readonly string[];
  readonly placedAt: string;
  readonly releasedAt: string | null;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExpiryEvaluationResponse {
  readonly recordId: string;
  readonly category: string;
  readonly policyId: string | null;
  readonly expiresAt: string | null;
  readonly isExpired: boolean;
  readonly isOnHold: boolean;
  readonly action: string | null;
}

export function toPolicy(policy: RetentionPolicy): PolicyResponse {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    category: policy.category,
    retentionDays: policy.retentionDays,
    action: policy.action,
    legalHoldEligible: policy.legalHoldEligible,
    enabled: policy.enabled,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

export function toLegalHold(hold: LegalHold): LegalHoldResponse {
  return {
    id: hold.id,
    reason: hold.reason,
    placedBy: hold.placedBy,
    status: hold.status,
    categories: hold.categories,
    recordIds: hold.recordIds,
    placedAt: hold.placedAt,
    releasedAt: hold.releasedAt,
    expiresAt: hold.expiresAt,
    createdAt: hold.createdAt,
    updatedAt: hold.updatedAt,
  };
}

export function toExpiryEvaluation(e: ExpiryEvaluation): ExpiryEvaluationResponse {
  return {
    recordId: e.recordId,
    category: e.category,
    policyId: e.policyId,
    expiresAt: e.expiresAt,
    isExpired: e.isExpired,
    isOnHold: e.isOnHold,
    action: e.action,
  };
}
