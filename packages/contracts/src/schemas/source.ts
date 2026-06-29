// Source entity: a referenceable origin (URL/document) with a trust tier.

import { z } from "zod";
import { sourceTierSchema } from "@veritas/core";
import {
  idSchema,
  timestampsSchema,
  urlSchema,
  nonEmptyString,
  hashSchema,
} from "./common.js";

export const SourceSchema = z
  .object({
    id: idSchema("source"),
    url: urlSchema,
    domain: nonEmptyString,
    title: z.string().nullable(),
    publisher: z.string().nullable(),
    tier: sourceTierSchema,
    publishedAt: z.string().nullable(),
    retrievedAt: z.string(),
    contentHash: hashSchema.nullable(),
    excerpt: z.string().nullable(),
  })
  .merge(timestampsSchema);
export type Source = z.infer<typeof SourceSchema>;

export const CreateSourceSchema = z.object({
  url: urlSchema,
  title: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  tier: sourceTierSchema.optional(),
  publishedAt: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
});
export type CreateSource = z.infer<typeof CreateSourceSchema>;

export const UpdateSourceSchema = CreateSourceSchema.partial();
export type UpdateSource = z.infer<typeof UpdateSourceSchema>;
