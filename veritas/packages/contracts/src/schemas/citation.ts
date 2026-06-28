// Citation entity: a pointer from a claim's reasoning into a specific source span.

import { z } from "zod";
import {
  idSchema,
  timestampsSchema,
  urlSchema,
  confidenceSchema,
} from "./common.js";

export const CitationSchema = z
  .object({
    id: idSchema("cite"),
    sourceId: idSchema("source"),
    url: urlSchema,
    title: z.string().nullable(),
    quote: z.string().nullable(),
    relevance: confidenceSchema,
    supports: z.boolean(),
  })
  .merge(timestampsSchema);
export type Citation = z.infer<typeof CitationSchema>;

export const CreateCitationSchema = z.object({
  sourceId: idSchema("source"),
  url: urlSchema,
  title: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
  relevance: confidenceSchema,
  supports: z.boolean(),
});
export type CreateCitation = z.infer<typeof CreateCitationSchema>;

export const UpdateCitationSchema = CreateCitationSchema.partial();
export type UpdateCitation = z.infer<typeof UpdateCitationSchema>;
