// Subgraph definition: describes a single federated GraphQL service with its schema and capabilities.
import { z } from "zod";
import type { FederationEntity, FederationKey } from "./types.js";

export const SubgraphCapabilitySchema = z.enum([
  "entities",
  "subscriptions",
  "mutations",
  "introspection",
]);
export type SubgraphCapability = z.infer<typeof SubgraphCapabilitySchema>;

export const SubgraphSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  sdl: z.string().min(1),
  version: z.string().default("2.0"),
  capabilities: z.array(SubgraphCapabilitySchema).default([]),
  entities: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Subgraph = z.infer<typeof SubgraphSchema>;

export const CreateSubgraphSchema = SubgraphSchema.omit({ version: true }).extend({
  version: z.string().optional(),
});
export type CreateSubgraph = z.infer<typeof CreateSubgraphSchema>;

export interface SubgraphDefinition {
  readonly subgraph: Subgraph;
  readonly keys: ReadonlyArray<FederationKey>;
  readonly entities: ReadonlyArray<FederationEntity>;
}

export function defineSubgraph(
  input: CreateSubgraph,
  keys: ReadonlyArray<FederationKey> = [],
  entities: ReadonlyArray<FederationEntity> = []
): SubgraphDefinition {
  const subgraph = SubgraphSchema.parse({ ...input, version: input.version ?? "2.0" });
  return Object.freeze({ subgraph, keys: Object.freeze([...keys]), entities: Object.freeze([...entities]) });
}

export function subgraphEntityNames(def: SubgraphDefinition): ReadonlyArray<string> {
  return def.entities.map((e) => e.typeName);
}

export function subgraphHasCapability(
  def: SubgraphDefinition,
  capability: SubgraphCapability
): boolean {
  return def.subgraph.capabilities.includes(capability);
}

export function mergeSubgraphMetadata(
  subgraph: Subgraph,
  extra: Record<string, unknown>
): Subgraph {
  return { ...subgraph, metadata: { ...(subgraph.metadata ?? {}), ...extra } };
}
