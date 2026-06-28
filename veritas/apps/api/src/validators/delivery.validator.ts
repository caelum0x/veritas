// Zod validators for delivery request bodies and query parameters.
import { z } from "zod";
import { DeliveryStatusSchema } from "@veritas/contracts";

export const listDeliveriesQuerySchema = z.object({
  orderId: z.string().optional(),
  status: DeliveryStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const getDeliveryParamsSchema = z.object({
  id: z.string().min(1),
});

export const confirmDeliveryParamsSchema = z.object({
  id: z.string().min(1),
});

export const confirmDeliveryBodySchema = z.object({
  receivedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const deliveryIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createDeliveryBodySchema = z.object({
  orderId: z.string().min(1),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDeliveryBodySchema = z.object({
  description: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const disputeDeliveryBodySchema = z.object({
  reason: z.string().min(1).max(2000),
});

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
export type GetDeliveryParams = z.infer<typeof getDeliveryParamsSchema>;
export type ConfirmDeliveryParams = z.infer<typeof confirmDeliveryParamsSchema>;
export type ConfirmDeliveryBody = z.infer<typeof confirmDeliveryBodySchema>;
export type DeliveryIdParam = z.infer<typeof deliveryIdParamSchema>;
export type CreateDeliveryBody = z.infer<typeof createDeliveryBodySchema>;
export type UpdateDeliveryBody = z.infer<typeof updateDeliveryBodySchema>;
export type DisputeDeliveryBody = z.infer<typeof disputeDeliveryBodySchema>;
