// Input/output DTOs for order use-cases in the services layer.
import { z } from "zod";
import {
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderSchema,
} from "@veritas/contracts";

/** Input for creating a new order. */
export const CreateOrderInputSchema = CreateOrderSchema;
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

/** Input for updating an order (admin/system level). */
export const UpdateOrderInputSchema = UpdateOrderSchema;
export type UpdateOrderInput = z.infer<typeof UpdateOrderInputSchema>;

/** Query parameters for listing orders. */
export const ListOrdersInputSchema = z.object({
  buyerAgentId: z.string().optional(),
  serviceId: z.string().optional(),
  negotiationId: z.string().optional(),
  status: z
    .enum(["PENDING", "PAID", "FULFILLED", "REFUNDED", "CANCELLED", "FAILED"])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListOrdersInput = z.infer<typeof ListOrdersInputSchema>;

/** Single order output as a plain object. */
export type OrderOutput = z.infer<typeof OrderSchema>;

/** Canonical order DTO factory from a raw Order record. */
export function toOrderOutput(order: OrderOutput): OrderOutput {
  return { ...order };
}
