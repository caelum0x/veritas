// Job entity: an asynchronous verification work item with lifecycle status.

import { z } from "zod";
import { jobStatusSchema } from "@veritas/core";
import { idSchema, timestampsSchema, metadataSchema } from "./common.js";
import { VerificationRequestSchema } from "../verification-request.js";

export const JobSchema = z
  .object({
    id: idSchema("job"),
    verificationId: idSchema("vrf").nullable(),
    status: jobStatusSchema,
    request: VerificationRequestSchema,
    attempts: z.number().int().min(0),
    error: z.string().nullable(),
    startedAt: z.string().nullable(),
    finishedAt: z.string().nullable(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Job = z.infer<typeof JobSchema>;

export const CreateJobSchema = z.object({
  request: VerificationRequestSchema,
  metadata: metadataSchema.optional(),
});
export type CreateJob = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = z.object({
  status: jobStatusSchema.optional(),
  verificationId: idSchema("vrf").nullable().optional(),
  error: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});
export type UpdateJob = z.infer<typeof UpdateJobSchema>;
