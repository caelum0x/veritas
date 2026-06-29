// Verdict entity: the adjudicated outcome for a single claim with confidence + reasoning.

import { z } from "zod";
import { verdictSchema } from "@veritas/core";
import { idSchema, timestampsSchema, confidenceSchema } from "./common.js";

export const VerdictSchema = z
  .object({
    id: idSchema("vdt"),
    claimId: idSchema("claim"),
    verdict: verdictSchema,
    confidence: confidenceSchema,
    reasoning: z.string(),
    citationIds: z.array(idSchema("cite")),
  })
  .merge(timestampsSchema);
export type VerdictRecord = z.infer<typeof VerdictSchema>;

export const CreateVerdictSchema = z.object({
  claimId: idSchema("claim"),
  verdict: verdictSchema,
  confidence: confidenceSchema,
  reasoning: z.string(),
  citationIds: z.array(idSchema("cite")).optional(),
});
export type CreateVerdict = z.infer<typeof CreateVerdictSchema>;
