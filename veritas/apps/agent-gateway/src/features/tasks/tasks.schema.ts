// Zod schemas for the tasks feature: inbound request validation and response shapes.

import { z } from "zod";
import { A2ATaskStatusSchema, A2ATaskPrioritySchema } from "@veritas/a2a-protocol";

/** Inbound POST /tasks body — creates a new verification task. */
export const CreateTaskBodySchema = z.object({
  /** Caller-supplied stable task identifier; generated if absent. */
  taskId: z.string().min(1).optional(),
  /** Conversation thread id; defaults to taskId when absent. */
  threadId: z.string().min(1).optional(),
  /** Correlation id echoed back in the A2A response envelope. */
  correlationId: z.string().optional(),
  /** Execution priority hint forwarded to the engine. */
  priority: A2ATaskPrioritySchema.default("normal"),
  /** A2A message payload carrying the verification request text. */
  message: z
    .object({
      id: z.string().min(1).optional(),
      role: z.enum(["user", "agent", "system"]).default("user"),
      createdAt: z.string().datetime({ offset: true }).optional(),
      parts: z
        .array(
          z
            .object({
              kind: z.string().min(1),
              text: z.string().optional(),
            })
            .passthrough()
        )
        .min(1),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
});
export type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>;

/** Path params for single-task routes. */
export const TaskParamsSchema = z.object({
  taskId: z.string().min(1),
});
export type TaskParams = z.infer<typeof TaskParamsSchema>;

/** Query params for GET /tasks list endpoint. */
export const ListTasksQuerySchema = z.object({
  status: A2ATaskStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

/** Shape of a task entry returned in list/get responses. */
export const TaskResponseSchema = z.object({
  taskId: z.string().min(1),
  threadId: z.string().min(1),
  status: A2ATaskStatusSchema,
  priority: A2ATaskPrioritySchema,
  correlationId: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }),
  finishedAt: z.string().datetime({ offset: true }).nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  report: z.unknown().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type TaskResponse = z.infer<typeof TaskResponseSchema>;

/** POST /tasks/:taskId/cancel — no body required. */
export const CancelTaskBodySchema = z.object({
  reason: z.string().optional(),
});
export type CancelTaskBody = z.infer<typeof CancelTaskBodySchema>;
