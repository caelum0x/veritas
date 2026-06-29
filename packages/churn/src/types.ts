// Core types for churn prediction, intervention, and health scoring.
import { z } from 'zod';
import { UserId, OrderId } from '@veritas/core';

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export const ChurnRiskSchema = z.enum(['low', 'medium', 'high', 'critical']);

export type InterventionType =
  | 'email_campaign'
  | 'discount_offer'
  | 'feature_highlight'
  | 'success_call'
  | 'plan_downgrade_offer';

export const InterventionTypeSchema = z.enum([
  'email_campaign',
  'discount_offer',
  'feature_highlight',
  'success_call',
  'plan_downgrade_offer',
]);

export type InterventionStatus = 'pending' | 'sent' | 'accepted' | 'declined' | 'expired';
export const InterventionStatusSchema = z.enum(['pending', 'sent', 'accepted', 'declined', 'expired']);

export interface ChurnSignal {
  readonly userId: UserId;
  readonly signalType: string;
  readonly value: number;
  readonly recordedAt: string;
}

export const ChurnSignalSchema = z.object({
  userId: z.string(),
  signalType: z.string(),
  value: z.number(),
  recordedAt: z.string(),
});

export interface RiskScore {
  readonly userId: UserId;
  readonly score: number; // 0-1
  readonly risk: ChurnRisk;
  readonly computedAt: string;
  readonly factors: ReadonlyArray<string>;
}

export const RiskScoreSchema = z.object({
  userId: z.string(),
  score: z.number().min(0).max(1),
  risk: ChurnRiskSchema,
  computedAt: z.string(),
  factors: z.array(z.string()),
});

export interface CohortMembership {
  readonly userId: UserId;
  readonly cohortId: string;
  readonly joinedAt: string;
}

export const CohortMembershipSchema = z.object({
  userId: z.string(),
  cohortId: z.string(),
  joinedAt: z.string(),
});

export interface Intervention {
  readonly id: string;
  readonly userId: UserId;
  readonly type: InterventionType;
  readonly status: InterventionStatus;
  readonly triggeredAt: string;
  readonly expiresAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export const InterventionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: InterventionTypeSchema,
  status: InterventionStatusSchema,
  triggeredAt: z.string(),
  expiresAt: z.string(),
  metadata: z.record(z.unknown()),
});

export interface AccountHealth {
  readonly userId: UserId;
  readonly healthScore: number; // 0-100
  readonly lastActivityAt: string;
  readonly activeFeatures: ReadonlyArray<string>;
  readonly computedAt: string;
}

export const AccountHealthSchema = z.object({
  userId: z.string(),
  healthScore: z.number().min(0).max(100),
  lastActivityAt: z.string(),
  activeFeatures: z.array(z.string()),
  computedAt: z.string(),
});
