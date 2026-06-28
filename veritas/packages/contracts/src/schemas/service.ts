// Service entity: a priced, advertised CAP capability offered by Veritas.

import { z } from "zod";
import {
  idSchema,
  timestampsSchema,
  moneySchema,
  metadataSchema,
} from "./common.js";

export const ServiceSchema = z
  .object({
    id: idSchema("svc"),
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    basePrice: moneySchema,
    active: z.boolean(),
    inputSchemaRef: z.string().nullable(),
    outputSchemaRef: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Service = z.infer<typeof ServiceSchema>;

export const CreateServiceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  basePrice: moneySchema,
  active: z.boolean().optional(),
  inputSchemaRef: z.string().nullable().optional(),
  outputSchemaRef: z.string().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateService = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = CreateServiceSchema.partial();
export type UpdateService = z.infer<typeof UpdateServiceSchema>;
