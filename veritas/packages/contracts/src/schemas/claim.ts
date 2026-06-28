// Claim entity: an atomic, checkable assertion extracted from input text.

import { z } from "zod";
import { verdictSchema } from "@veritas/core";
import {
  idSchema,
  timestampsSchema,
  confidenceSchema,
  nonEmptyString,
} from "./common.js";

export const ClaimSchema = z
  .object({
    id: idSchema("claim"),
    text: nonEmptyString,
    normalized: z.string().nullable(),
    verdict: verdictSchema.nullable(),
    confidence: confidenceSchema.nullable(),
    reasoning: z.string().nullable(),
    citationIds: z.array(idSchema("cite")),
    order: z.number().int().min(0),
  })
  .merge(timestampsSchema);
export type Claim = z.infer<typeof ClaimSchema>;

export const CreateClaimSchema = z.object({
  text: nonEmptyString,
  order: z.number().int().min(0).optional(),
});
export type CreateClaim = z.infer<typeof CreateClaimSchema>;

export const UpdateClaimSchema = z.object({
  normalized: z.string().nullable().optional(),
  verdict: verdictSchema.nullable().optional(),
  confidence: confidenceSchema.nullable().optional(),
  reasoning: z.string().nullable().optional(),
});
export type UpdateClaim = z.infer<typeof UpdateClaimSchema>;
