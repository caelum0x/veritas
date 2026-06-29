// Zod schemas for trials feature HTTP request/response validation.
import { z } from "zod";

export const CreateTrialBodySchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  durationDays: z.number().int().min(1).max(365),
  metadata: z.record(z.string()).optional(),
});
export type CreateTrialBody = z.infer<typeof CreateTrialBodySchema>;

export const ExtendTrialBodySchema = z.object({
  daysToAdd: z.number().int().min(1).max(90),
  reason: z.string().min(1),
});
export type ExtendTrialBody = z.infer<typeof ExtendTrialBodySchema>;

export const ConvertTrialBodySchema = z.object({
  planId: z.string().min(1),
});
export type ConvertTrialBody = z.infer<typeof ConvertTrialBodySchema>;

export const TrialIdParamSchema = z.object({ trialId: z.string().min(1) });
export const UserIdParamSchema = z.object({ userId: z.string().min(1) });
