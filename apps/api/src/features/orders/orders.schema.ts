// Zod schemas for order HTTP request validation (body, query, params).
import { z } from "zod";
import { CreateOrderSchema, UpdateOrderSchema } from "@veritas/contracts";

export const createOrderBodySchema = CreateOrderSchema;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const updateOrderBodySchema = UpdateOrderSchema;
export type UpdateOrderBody = z.infer<typeof updateOrderBodySchema>;

export const listOrdersQuerySchema = z.object({
  buyerAgentId: z.string().optional(),
  serviceId: z.string().optional(),
  negotiationId: z.string().optional(),
  status: z
    .enum(["PENDING", "PAID", "FULFILLED", "REFUNDED", "CANCELLED", "FAILED"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderIdParamSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
});
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;

export const markPaidBodySchema = z.object({});
export type MarkPaidBody = z.infer<typeof markPaidBodySchema>;

export const markFulfilledBodySchema = z.object({
  jobId: z.string().min(1),
  settlementId: z.string().optional(),
});
export type MarkFulfilledBody = z.infer<typeof markFulfilledBodySchema>;
