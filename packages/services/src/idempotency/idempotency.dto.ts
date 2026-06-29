// Input/output DTOs for idempotency key application service use-cases.
import { z } from "zod";
import {
  IdempotencyKeySchema,
  CreateIdempotencyKeySchema,
  IdempotencyKeyStatusSchema,
} from "@veritas/contracts";

/** Input for recording a new idempotency key and its initial request payload. */
export const CreateIdempotencyKeyInputSchema = CreateIdempotencyKeySchema;
export type CreateIdempotencyKeyInput = z.infer<typeof CreateIdempotencyKeyInputSchema>;

/** Input for looking up an existing idempotency key. */
export const GetIdempotencyKeyInputSchema = z.object({
  key: z.string().min(1).max(255),
  ownerId: z.string().min(1),
});
export type GetIdempotencyKeyInput = z.infer<typeof GetIdempotencyKeyInputSchema>;

/** Input for resolving an in-progress key as completed with a stored response. */
export const ResolveIdempotencyKeyInputSchema = z.object({
  key: z.string().min(1).max(255),
  ownerId: z.string().min(1),
  status: IdempotencyKeyStatusSchema,
  responseBody: z.unknown().optional(),
  responseStatusCode: z.number().int().min(100).max(599).optional(),
});
export type ResolveIdempotencyKeyInput = z.infer<typeof ResolveIdempotencyKeyInputSchema>;

/** Input for listing idempotency keys belonging to an owner. */
export const ListIdempotencyKeysInputSchema = z.object({
  ownerId: z.string().min(1),
  status: IdempotencyKeyStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListIdempotencyKeysInput = z.infer<typeof ListIdempotencyKeysInputSchema>;

/** Input for purging expired idempotency keys older than a given timestamp. */
export const PurgeIdempotencyKeysInputSchema = z.object({
  olderThanIso: z.string().datetime(),
  ownerId: z.string().min(1).optional(),
});
export type PurgeIdempotencyKeysInput = z.infer<typeof PurgeIdempotencyKeysInputSchema>;

/** Single idempotency key output. */
export type IdempotencyKeyOutput = z.infer<typeof IdempotencyKeySchema>;

/** Paginated list of idempotency key outputs. */
export const IdempotencyKeyListOutputSchema = z.object({
  items: z.array(IdempotencyKeySchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});
export type IdempotencyKeyListOutput = z.infer<typeof IdempotencyKeyListOutputSchema>;

/** Result returned when resolving or checking a key — indicates whether it was a replay. */
export const IdempotencyCheckResultSchema = z.object({
  isReplay: z.boolean(),
  key: IdempotencyKeySchema,
});
export type IdempotencyCheckResult = z.infer<typeof IdempotencyCheckResultSchema>;
