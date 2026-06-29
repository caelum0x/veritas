// Shared types for the replication package.
import { z } from "zod";

export const ReplicaRoleSchema = z.enum(["primary", "replica"]);
export type ReplicaRole = z.infer<typeof ReplicaRoleSchema>;

export const ReplicaStatusSchema = z.enum(["healthy", "degraded", "unavailable"]);
export type ReplicaStatus = z.infer<typeof ReplicaStatusSchema>;

export const ConsistencyLevelSchema = z.enum(["eventual", "bounded_staleness", "strong"]);
export type ConsistencyLevel = z.infer<typeof ConsistencyLevelSchema>;

export const ReplicaNodeSchema = z.object({
  id: z.string(),
  role: ReplicaRoleSchema,
  region: z.string(),
  host: z.string(),
  port: z.number().int().positive(),
  weight: z.number().int().min(1).default(1),
  status: ReplicaStatusSchema.default("healthy"),
  lagMs: z.number().nonnegative().default(0),
  lastCheckedAt: z.string().optional(),
});
export type ReplicaNode = z.infer<typeof ReplicaNodeSchema>;

export const ReplicaSetConfigSchema = z.object({
  setId: z.string(),
  nodes: z.array(ReplicaNodeSchema).min(1),
  maxAcceptableLagMs: z.number().nonnegative().default(5000),
  defaultConsistency: ConsistencyLevelSchema.default("eventual"),
});
export type ReplicaSetConfig = z.infer<typeof ReplicaSetConfigSchema>;

export const RouteDecisionSchema = z.object({
  node: ReplicaNodeSchema,
  reason: z.string(),
});
export type RouteDecision = z.infer<typeof RouteDecisionSchema>;

export interface ReplicaHealth {
  readonly nodeId: string;
  readonly status: ReplicaStatus;
  readonly lagMs: number;
  readonly checkedAt: string;
  readonly errorMessage?: string;
}

export interface LagSnapshot {
  readonly nodeId: string;
  readonly lagMs: number;
  readonly recordedAt: string;
}

// Aliases expected by index.ts
export type ReplicaId = string;
export type ReadConsistency = ConsistencyLevel;
export type WriteConsistency = "primary-only" | "majority" | "all";

export interface ReplicaSet {
  readonly config: ReplicaSetConfig;
  readonly nodes: ReadonlyArray<ReplicaNode>;
}

export interface ReplicaLag {
  readonly nodeId: string;
  readonly lagMs: number;
  readonly updatedAt: string;
}

export type FailoverPolicy = "auto" | "manual";

export interface FailoverResult {
  readonly previousPrimary: string;
  readonly newPrimary: string;
  readonly triggeredAt: string;
  readonly reason: string;
}

export interface RouterOptions {
  readonly consistency: ReadConsistency;
  readonly preferRegion?: string;
  readonly excludeNodes?: ReadonlyArray<string>;
}

export interface SplitOptions {
  readonly defaultConsistency: ReadConsistency;
  readonly maxLagMs: number;
}
