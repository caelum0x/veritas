// Zod request/response schemas for the SLO feature — all HTTP boundaries validated here.
import { z } from "zod";

export const SloWindowKindSchema = z.enum(["rolling", "calendar"]);

export const CreateSloBodySchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  sliName: z.string().min(1, "sliName is required"),
  targetRatio: z.number().min(0).max(1),
  windowDurationMs: z.number().int().positive(),
  windowKind: SloWindowKindSchema,
  tags: z.record(z.string()).optional(),
});

export type CreateSloBody = z.infer<typeof CreateSloBodySchema>;

export const UpdateSloBodySchema = CreateSloBodySchema.partial();
export type UpdateSloBody = z.infer<typeof UpdateSloBodySchema>;

export const ListEvaluationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export type ListEvaluationsQuery = z.infer<typeof ListEvaluationsQuerySchema>;

export const EvaluateSloBodySchema = z.object({
  /** Epoch ms for the evaluation point (defaults to now). */
  nowMs: z.number().int().nonnegative().optional(),
  /** Good events observed in the current window. */
  goodCount: z.number().int().nonnegative(),
  /** Total events observed in the current window. */
  totalCount: z.number().int().nonnegative(),
});

export type EvaluateSloBody = z.infer<typeof EvaluateSloBodySchema>;

export const ListReportsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;
