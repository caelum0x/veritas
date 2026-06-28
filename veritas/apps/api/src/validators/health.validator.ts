// Zod validators for health check request parameters
import { z } from "zod";

export const HealthQuerySchema = z.object({
  verbose: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type HealthQuery = z.infer<typeof HealthQuerySchema>;
