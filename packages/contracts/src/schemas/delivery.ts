// Delivery entity: the fulfilled artifact (report) handed back for a paid order.

import { z } from "zod";
import { idSchema, timestampsSchema, hashSchema } from "./common.js";
import { VerificationReportSchema } from "../verification-report.js";

export const DeliveryStatusSchema = z.enum([
  "PENDING",
  "DELIVERED",
  "FAILED",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const DeliverySchema = z
  .object({
    id: idSchema("dlv"),
    orderId: idSchema("order"),
    reportId: idSchema("rpt").nullable(),
    status: DeliveryStatusSchema,
    contentHash: hashSchema.nullable(),
    report: VerificationReportSchema.nullable(),
    deliveredAt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Delivery = z.infer<typeof DeliverySchema>;

export const CreateDeliverySchema = z.object({
  orderId: idSchema("order"),
  reportId: idSchema("rpt").nullable().optional(),
});
export type CreateDelivery = z.infer<typeof CreateDeliverySchema>;
