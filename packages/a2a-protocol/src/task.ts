// A2A task: unit of work dispatched between agents with lifecycle state.

import { z } from "zod";

export const A2ATaskStatusSchema = z.enum([
  "submitted",
  "working",
  "input-required",
  "completed",
  "failed",
  "cancelled",
]);
export type A2ATaskStatus = z.infer<typeof A2ATaskStatusSchema>;

export const A2ATaskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type A2ATaskPriority = z.infer<typeof A2ATaskPrioritySchema>;

export const A2ATaskSchema = z.object({
  /** Unique task identifier. */
  id: z.string().min(1),
  /** Capability id this task targets. */
  capabilityId: z.string().min(1),
  /** Agent that created the task. */
  originatorAgentId: z.string().min(1),
  /** Agent assigned to execute the task. */
  assignedAgentId: z.string().min(1).optional(),
  /** Current lifecycle status. */
  status: A2ATaskStatusSchema.default("submitted"),
  /** Task priority hint. */
  priority: A2ATaskPrioritySchema.default("normal"),
  /** Free-form task description / goal. */
  description: z.string(),
  /** Structured input payload (capability-specific). */
  input: z.record(z.string(), z.unknown()),
  /** Structured output payload populated on completion. */
  output: z.record(z.string(), z.unknown()).optional(),
  /** Human-readable status or failure reason. */
  statusMessage: z.string().optional(),
  /** ISO-8601 deadline hint. */
  deadline: z.string().datetime({ offset: true }).optional(),
  /** ISO-8601 creation time. */
  createdAt: z.string().datetime({ offset: true }),
  /** ISO-8601 last-update time. */
  updatedAt: z.string().datetime({ offset: true }),
  /** Arbitrary JSON-safe metadata. */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type A2ATask = z.infer<typeof A2ATaskSchema>;

export const CreateA2ATaskSchema = A2ATaskSchema.pick({
  id: true,
  capabilityId: true,
  originatorAgentId: true,
  description: true,
  input: true,
  priority: true,
  deadline: true,
  metadata: true,
}).partial({ priority: true, deadline: true, metadata: true });
export type CreateA2ATask = z.infer<typeof CreateA2ATaskSchema>;

export const UpdateA2ATaskSchema = z.object({
  assignedAgentId: z.string().min(1).optional(),
  status: A2ATaskStatusSchema.optional(),
  statusMessage: z.string().optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  updatedAt: z.string().datetime({ offset: true }),
});
export type UpdateA2ATask = z.infer<typeof UpdateA2ATaskSchema>;

/** Return true when the task has reached a terminal state. */
export function isTerminalStatus(status: A2ATaskStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
