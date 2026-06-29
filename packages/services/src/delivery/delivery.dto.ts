// Input/output DTOs for delivery use-cases.
import { z } from "zod";
import { DeliverySchema, CreateDeliverySchema, DeliveryStatusSchema } from "@veritas/contracts";

/** DTO for creating a new delivery record linked to an order. */
export const CreateDeliveryInputSchema = CreateDeliverySchema;
export type CreateDeliveryInput = z.infer<typeof CreateDeliveryInputSchema>;

/** DTO for marking a delivery as fulfilled (DELIVERED or FAILED). */
export const UpdateDeliveryStatusInputSchema = z.object({
  status: DeliveryStatusSchema,
  reportId: z.string().nullable().optional(),
  contentHash: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
});
export type UpdateDeliveryStatusInput = z.infer<typeof UpdateDeliveryStatusInputSchema>;

/** DTO for filtering deliveries in list queries. */
export const ListDeliveriesInputSchema = z.object({
  orderId: z.string().optional(),
  status: DeliveryStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListDeliveriesInput = z.infer<typeof ListDeliveriesInputSchema>;

/** Output DTO representing a single delivery. */
export const DeliveryOutputSchema = DeliverySchema;
export type DeliveryOutput = z.infer<typeof DeliveryOutputSchema>;
