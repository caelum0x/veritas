// Evidence entity: a retrieved snippet weighed for/against a claim during adjudication.

import { z } from "zod";
import {
  idSchema,
  timestampsSchema,
  urlSchema,
  confidenceSchema,
} from "./common.js";

export const EvidenceStanceSchema = z.enum(["supports", "refutes", "neutral"]);
export type EvidenceStance = z.infer<typeof EvidenceStanceSchema>;

export const EvidenceSchema = z
  .object({
    id: idSchema("evd"),
    claimId: idSchema("claim"),
    sourceId: idSchema("source").nullable(),
    url: urlSchema.nullable(),
    snippet: z.string(),
    stance: EvidenceStanceSchema,
    weight: confidenceSchema,
  })
  .merge(timestampsSchema);
export type Evidence = z.infer<typeof EvidenceSchema>;

export const CreateEvidenceSchema = z.object({
  claimId: idSchema("claim"),
  sourceId: idSchema("source").nullable().optional(),
  url: urlSchema.nullable().optional(),
  snippet: z.string(),
  stance: EvidenceStanceSchema,
  weight: confidenceSchema,
});
export type CreateEvidence = z.infer<typeof CreateEvidenceSchema>;
