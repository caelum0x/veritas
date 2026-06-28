// Endpoint descriptor — URL, protocol, and transport metadata for agent card entries.

import { z } from "zod";
import { AuthSchemeSchema } from "./authentication.js";

export const ProtocolSchema = z.enum([
  "https",
  "grpc",
  "grpcs",
  "ws",
  "wss",
  "a2a",
  "mcp",
]);
export type Protocol = z.infer<typeof ProtocolSchema>;

export const ContentTypeSchema = z.enum([
  "application/json",
  "application/x-ndjson",
  "text/event-stream",
  "application/grpc",
  "application/grpc+proto",
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const EndpointSchema = z.object({
  /** Logical name used for routing. */
  name: z.string().min(1),
  /** Fully-qualified base URL, e.g. https://api.veritas.croo.ai/v1 */
  url: z.string().url(),
  protocol: ProtocolSchema,
  /** Default content-type produced by the endpoint. */
  contentType: ContentTypeSchema.default("application/json"),
  /** Auth scheme required to call this endpoint. */
  auth: AuthSchemeSchema,
  /** Optional human-readable description. */
  description: z.string().optional(),
  /** Whether the endpoint supports streaming responses. */
  streaming: z.boolean().default(false),
  /** Arbitrary key-value metadata tags. */
  tags: z.record(z.string()).default({}),
});
export type Endpoint = z.infer<typeof EndpointSchema>;

export const CreateEndpointSchema = EndpointSchema.omit({
  contentType: true,
  streaming: true,
  tags: true,
}).extend({
  contentType: ContentTypeSchema.optional(),
  streaming: z.boolean().optional(),
  tags: z.record(z.string()).optional(),
});
export type CreateEndpoint = z.infer<typeof CreateEndpointSchema>;

/** Build a validated Endpoint, filling in defaults. */
export function makeEndpoint(input: CreateEndpoint): Endpoint {
  return EndpointSchema.parse(input);
}
