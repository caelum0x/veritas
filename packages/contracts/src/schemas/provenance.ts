// Provenance entity: tamper-evident metadata about how a report was produced.

import { z } from "zod";
import { hashSchema, timestampSchema } from "./common.js";

export const ProvenanceSchema = z.object({
  contentHash: hashSchema,
  verifier: z.string(),
  verifierVersion: z.string(),
  model: z.string(),
  effort: z.string(),
  createdAt: timestampSchema,
  claimCount: z.number().int().min(0),
  sourceCount: z.number().int().min(0),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const CreateProvenanceSchema = ProvenanceSchema.omit({
  createdAt: true,
});
export type CreateProvenance = z.infer<typeof CreateProvenanceSchema>;
