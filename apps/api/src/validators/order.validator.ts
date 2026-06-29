// Zod validators for order request bodies and query parameters.
import { z } from "zod";
import { CreateOrderSchema, UpdateOrderSchema } from "@veritas/contracts";
import { paginationSchema } from "@veritas/contracts";

export const createOrderBodySchema = CreateOrderSchema;

export const updateOrderBodySchema = UpdateOrderSchema;

export const listOrdersQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  agentId: z.string().optional(),
  serviceId: z.string().optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
});

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderBodySchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
