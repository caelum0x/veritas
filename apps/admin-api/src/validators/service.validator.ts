// Zod validators for service admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listServicesSchema = z.object({
  query: paginationSchema.extend({
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    agentId: z.string().optional(),
  }),
});

export const getServiceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createServiceSchema = z.object({
  body: z.object({
    agentId: z.string().min(1),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    endpoint: z.string().url(),
    isActive: z.boolean().default(true),
    pricePerCallUsdc: z.number().int().min(0).default(0),
    rateLimitPerMinute: z.number().int().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const updateServiceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    endpoint: z.string().url().optional(),
    isActive: z.boolean().optional(),
    pricePerCallUsdc: z.number().int().min(0).optional(),
    rateLimitPerMinute: z.number().int().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export const deleteServiceSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type ListServicesInput = z.infer<typeof listServicesSchema>;
export type GetServiceInput = z.infer<typeof getServiceSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type DeleteServiceInput = z.infer<typeof deleteServiceSchema>;
