// Zod validators for service request bodies and query params
import { z } from "zod";
import { ServiceSchema, CreateServiceSchema, UpdateServiceSchema } from "@veritas/contracts";

export const createServiceBodySchema = CreateServiceSchema;
export const updateServiceBodySchema = UpdateServiceSchema;

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  agentId: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

export const serviceIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceBodySchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;
export type Service = z.infer<typeof ServiceSchema>;
