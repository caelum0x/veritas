// Zod validators for Usage admin endpoints
import { z } from "zod";
import { paginationSchema } from "@veritas/contracts";

export const listUsageQuerySchema = z.object({
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  ...paginationSchema.shape,
});

export const getUsageParamsSchema = z.object({
  id: z.string().min(1),
});

export type ListUsageQuery = z.infer<typeof listUsageQuerySchema>;
export type GetUsageParams = z.infer<typeof getUsageParamsSchema>;
