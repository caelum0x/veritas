// Shard migration plan: compute, validate and track key moves between shards.

import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import { MigrationError } from "./errors.js";
import { ShardDescriptor } from "./registry.js";

export const MigrationStepSchema = z.object({
  /** Unique step identifier. */
  stepId: z.string().min(1),
  /** Source shard. */
  fromShardId: z.string().min(1),
  /** Destination shard. */
  toShardId: z.string().min(1),
  /** Inclusive key range being moved. */
  keyRangeStart: z.string(),
  keyRangeEnd: z.string(),
  /** Estimated number of records affected. */
  estimatedRecords: z.number().int().min(0),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
});
export type MigrationStep = z.infer<typeof MigrationStepSchema>;

export const MigrationPlanSchema = z.object({
  planId: z.string().min(1),
  reason: z.string().min(1),
  steps: z.array(MigrationStepSchema).min(1),
  createdAt: z.string().datetime(),
  /** Overall status derived from steps. */
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
});
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>;

/** Build a migration plan when adding a new shard to absorb load from existing shards. */
export function planAddShard(
  planId: string,
  newShard: ShardDescriptor,
  donors: readonly ShardDescriptor[],
  estimatedRecordsPerShard: number,
  now: string,
): Result<MigrationPlan, MigrationError> {
  if (donors.length === 0) {
    return err(new MigrationError("No donor shards provided for add-shard migration"));
  }
  const steps: MigrationStep[] = donors.map((donor, i) => ({
    stepId: `${planId}-step-${i}`,
    fromShardId: donor.id,
    toShardId: newShard.id,
    keyRangeStart: donor.rangeStart ?? "",
    keyRangeEnd: donor.rangeEnd ?? "",
    estimatedRecords: Math.floor(estimatedRecordsPerShard / donors.length),
    status: "pending",
  }));

  const plan: MigrationPlan = {
    planId,
    reason: `Add shard ${newShard.id}`,
    steps,
    createdAt: now,
    status: "pending",
  };
  return ok(Object.freeze(plan));
}

/** Build a migration plan when removing a shard, redistributing its keys to receivers. */
export function planRemoveShard(
  planId: string,
  retiring: ShardDescriptor,
  receivers: readonly ShardDescriptor[],
  estimatedRecords: number,
  now: string,
): Result<MigrationPlan, MigrationError> {
  if (receivers.length === 0) {
    return err(new MigrationError("No receiver shards provided for remove-shard migration"));
  }
  const perReceiver = Math.floor(estimatedRecords / receivers.length);
  const steps: MigrationStep[] = receivers.map((receiver, i) => ({
    stepId: `${planId}-step-${i}`,
    fromShardId: retiring.id,
    toShardId: receiver.id,
    keyRangeStart: retiring.rangeStart ?? "",
    keyRangeEnd: retiring.rangeEnd ?? "",
    estimatedRecords: perReceiver,
    status: "pending",
  }));

  const plan: MigrationPlan = {
    planId,
    reason: `Remove shard ${retiring.id}`,
    steps,
    createdAt: now,
    status: "pending",
  };
  return ok(Object.freeze(plan));
}

/** Derive aggregate plan status from its steps. */
export function derivePlanStatus(steps: readonly MigrationStep[]): MigrationPlan["status"] {
  if (steps.every(s => s.status === "completed")) return "completed";
  if (steps.some(s => s.status === "failed")) return "failed";
  if (steps.some(s => s.status === "in_progress" || s.status === "completed")) return "in_progress";
  return "pending";
}

/** Apply a step status update immutably, returning a new plan. */
export function applyStepUpdate(
  plan: MigrationPlan,
  stepId: string,
  status: MigrationStep["status"],
): Result<MigrationPlan, MigrationError> {
  const idx = plan.steps.findIndex(s => s.stepId === stepId);
  if (idx === -1) return err(new MigrationError(`Step not found: ${stepId}`));
  const updatedSteps = plan.steps.map((s, i) => (i === idx ? { ...s, status } : s));
  const updatedPlan: MigrationPlan = { ...plan, steps: updatedSteps, status: derivePlanStatus(updatedSteps) };
  return ok(Object.freeze(updatedPlan));
}
