// Shared value types and enums for the access-review module.
import { z } from "zod";
import { type IsoTimestamp, type UserId } from "@veritas/core";

export const ReviewStatusSchema = z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const DecisionOutcomeSchema = z.enum(["APPROVE", "REVOKE", "ABSTAIN"]);
export type DecisionOutcome = z.infer<typeof DecisionOutcomeSchema>;

export const ReviewFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]);
export type ReviewFrequency = z.infer<typeof ReviewFrequencySchema>;

export const CertificationStatusSchema = z.enum(["PENDING", "CERTIFIED", "REJECTED", "EXPIRED"]);
export type CertificationStatus = z.infer<typeof CertificationStatusSchema>;

export const EntitlementTypeSchema = z.enum(["ROLE", "PERMISSION", "RESOURCE_ACCESS", "GROUP_MEMBERSHIP"]);
export type EntitlementType = z.infer<typeof EntitlementTypeSchema>;

export interface ReviewPeriod {
  readonly startedAt: IsoTimestamp;
  readonly dueAt: IsoTimestamp;
  readonly closedAt?: IsoTimestamp;
}

export interface ReviewScope {
  readonly organizationId: string;
  readonly resourceTypes: readonly string[];
  readonly userIds?: readonly UserId[];
  readonly groupIds?: readonly string[];
}

export interface ReviewStats {
  readonly totalEntitlements: number;
  readonly approved: number;
  readonly revoked: number;
  readonly abstained: number;
  readonly pending: number;
}

export const ReviewScopeSchema = z.object({
  organizationId: z.string().min(1),
  resourceTypes: z.array(z.string()).min(1),
  userIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

export const ReviewPeriodSchema = z.object({
  startedAt: z.string().datetime(),
  dueAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
});
