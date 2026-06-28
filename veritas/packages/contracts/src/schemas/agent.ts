// Agent entity: an external CAP agent that buys/sells verification services.

import { z } from "zod";
import {
  idSchema,
  timestampsSchema,
  urlSchema,
  metadataSchema,
} from "./common.js";

export const AgentSchema = z
  .object({
    id: idSchema("agent"),
    name: z.string(),
    walletAddress: z.string(),
    endpoint: urlSchema.nullable(),
    publicKey: z.string().nullable(),
    trusted: z.boolean(),
    metadata: metadataSchema.optional(),
  })
  .merge(timestampsSchema);
export type Agent = z.infer<typeof AgentSchema>;

export const CreateAgentSchema = z.object({
  name: z.string(),
  walletAddress: z.string(),
  endpoint: urlSchema.nullable().optional(),
  publicKey: z.string().nullable().optional(),
  metadata: metadataSchema.optional(),
});
export type CreateAgent = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = z.object({
  name: z.string().optional(),
  endpoint: urlSchema.nullable().optional(),
  publicKey: z.string().nullable().optional(),
  trusted: z.boolean().optional(),
  metadata: metadataSchema.optional(),
});
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;
