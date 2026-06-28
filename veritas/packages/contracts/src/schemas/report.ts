// Report entity: a persisted verification report with claims, verdicts and provenance.

import { z } from "zod";
import { verdictSchema } from "@veritas/core";
import {
  idSchema,
  timestampsSchema,
  trustScoreSchema,
  confidenceSchema,
  hashSchema,
} from "./common.js";
import { ProvenanceSchema } from "./provenance.js";

export const ReportVerdictCountsSchema = z.object({
  supported: z.number().int().min(0),
  refuted: z.number().int().min(0),
  unverifiable: z.number().int().min(0),
});
export type ReportVerdictCounts = z.infer<typeof ReportVerdictCountsSchema>;

export const ReportClaimSchema = z.object({
  claim: z.string(),
  verdict: verdictSchema,
  confidence: confidenceSchema,
  reasoning: z.string(),
  citationIds: z.array(idSchema("cite")),
});
export type ReportClaim = z.infer<typeof ReportClaimSchema>;

export const ReportSchema = z
  .object({
    id: idSchema("rpt"),
    verificationId: idSchema("vrf"),
    contentHash: hashSchema,
    summary: z.string(),
    trustScore: trustScoreSchema,
    counts: ReportVerdictCountsSchema,
    claims: z.array(ReportClaimSchema),
    provenance: ProvenanceSchema,
  })
  .merge(timestampsSchema);
export type Report = z.infer<typeof ReportSchema>;

export const CreateReportSchema = ReportSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateReport = z.infer<typeof CreateReportSchema>;
