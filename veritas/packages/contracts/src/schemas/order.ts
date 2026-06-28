// Order entity: a paid request settled in USDC on Base, driving a verification job.

import { z } from "zod";
import { orderStatusSchema } from "@veritas/core";
import {
  idSchema,
  timestampsSchema,
  moneySchema,
  metadataSchema,
} from "./common.js";

export const OrderSchema = z
  .object({
    id: idSchema("order"),
    negotiationId: idSchema("neg").nullable(),
    serviceId: idSchema("svc"),
    buyerAgentId: idSchema("agent"),
    jobId: idSchema("job").nullable(),
    status: orderStatusSchema,
    price: moneySchema,
    settlementId: idSchema("stl").nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderSchema = z.object({
  negotiationId: idSchema("neg").nullable().optional(),
  serviceId: idSchema("svc"),
  buyerAgentId: idSchema("agent"),
  price: moneySchema,
  metadata: metadataSchema.optional(),
});
export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  jobId: idSchema("job").nullable().optional(),
  settlementId: idSchema("stl").nullable().optional(),
});
export type UpdateOrder = z.infer<typeof UpdateOrderSchema>;
