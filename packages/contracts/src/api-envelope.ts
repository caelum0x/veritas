// Zod schemas for the standard API success/error response envelope.

import { z } from "zod";

/** Error body included in a failed API response. */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorDto = z.infer<typeof apiErrorSchema>;

/** Pagination metadata for list responses. */
export const pageMetaSchema = z.object({
  total: z.number().int().min(0).optional(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PageMetaDto = z.infer<typeof pageMetaSchema>;

/** Build a success-envelope schema for a given data schema. */
export function apiSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    error: z.null(),
  });
}

/** Build a paginated success-envelope schema for a given item schema. */
export function apiPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(item),
    error: z.null(),
    meta: pageMetaSchema,
  });
}

/** Failure-envelope schema (data is always null). */
export const apiFailureSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: apiErrorSchema,
});
export type ApiFailureDto = z.infer<typeof apiFailureSchema>;

/** Build the discriminated-union response schema for a data schema. */
export function apiResponseSchema<T extends z.ZodTypeAny>(data: T) {
  return z.union([apiSuccessSchema(data), apiFailureSchema]);
}
