// Declares and builds the MCP server capability advertisement sent during initialize.
import { z } from "zod";

/** Schema for MCP server capabilities object. */
export const serverCapabilitiesSchema = z.object({
  tools: z.object({ listChanged: z.boolean().optional() }).optional(),
  resources: z
    .object({ subscribe: z.boolean().optional(), listChanged: z.boolean().optional() })
    .optional(),
  prompts: z.object({ listChanged: z.boolean().optional() }).optional(),
  logging: z.object({}).optional(),
  experimental: z.record(z.unknown()).optional(),
});

export type ServerCapabilities = z.infer<typeof serverCapabilitiesSchema>;

/** Options for capability advertisement; controls which features are declared. */
export interface CapabilityOptions {
  readonly tools?: boolean;
  readonly resources?: boolean;
  readonly prompts?: boolean;
  readonly logging?: boolean;
}

/**
 * Build the MCP server capabilities object from feature flags.
 * Returns a plain Record so it can be embedded directly in initialize responses.
 */
export function buildCapabilities(
  opts: CapabilityOptions = {},
): Record<string, unknown> {
  const caps: Record<string, unknown> = {};

  const tools = opts.tools ?? true;
  const resources = opts.resources ?? true;
  const prompts = opts.prompts ?? true;
  const logging = opts.logging ?? true;

  if (tools) caps["tools"] = { listChanged: false };
  if (resources) caps["resources"] = { subscribe: false, listChanged: false };
  if (prompts) caps["prompts"] = { listChanged: false };
  if (logging) caps["logging"] = {};

  return caps;
}

/** Default Veritas MCP capability set (all features enabled). */
export const VERITAS_CAPABILITIES: Readonly<Record<string, unknown>> = Object.freeze(
  buildCapabilities({ tools: true, resources: true, prompts: true, logging: true }),
);

/** Returns true if the given capability key is present in the built capabilities. */
export function hasCapability(caps: Record<string, unknown>, key: string): boolean {
  return key in caps && caps[key] !== undefined;
}
