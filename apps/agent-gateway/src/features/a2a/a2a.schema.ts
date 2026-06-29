// Zod request/response schemas for the A2A feature HTTP endpoints.

import { z } from "zod";
import {
  A2AMessagePartSchema,
  A2ATaskStatusSchema,
  A2ATaskPrioritySchema,
} from "@veritas/a2a-protocol";

/** Inbound task submission body. */
export const SubmitTaskBodySchema = z.object({
  taskId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  correlationId: z.string().optional(),
  priority: A2ATaskPrioritySchema.optional().default("normal"),
  message: z.object({
    id: z.string().min(1).optional(),
    role: z.enum(["user", "agent", "system"]).optional().default("user"),
    parts: z.array(A2AMessagePartSchema).min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type SubmitTaskBody = z.infer<typeof SubmitTaskBodySchema>;

/** Path params for task lookup. */
export const TaskParamsSchema = z.object({
  taskId: z.string().min(1),
});
export type TaskParams = z.infer<typeof TaskParamsSchema>;

/** Query params for task listing. */
export const ListTasksQuerySchema = z.object({
  status: A2ATaskStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

/** Inbound CAP negotiation callback body. */
export const CapNegotiationCallbackSchema = z.object({
  accepted: z.boolean(),
  orderId: z.string().optional(),
  counterOffer: z.string().optional(),
  reason: z.string().optional(),
});
export type CapNegotiationCallback = z.infer<typeof CapNegotiationCallbackSchema>;

/** Inbound CAP delivery body. */
export const CapDeliveryBodySchema = z.object({
  orderId: z.string().min(1),
  schema: z.string().min(1),
  payload: z.unknown(),
  deliveredAt: z.string().datetime({ offset: true }),
});
export type CapDeliveryBody = z.infer<typeof CapDeliveryBodySchema>;
