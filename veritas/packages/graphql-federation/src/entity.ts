// Federated entity management: registers and resolves entity types shared across subgraphs.
import { z } from "zod";
import { FederationEntitySchema, type FederationEntity } from "./types.js";

export const EntityRegistryEntrySchema = FederationEntitySchema.extend({
  resolverRegistered: z.boolean().default(false),
});
export type EntityRegistryEntry = z.infer<typeof EntityRegistryEntrySchema>;

export interface EntityRegistry {
  readonly entries: ReadonlyMap<string, EntityRegistryEntry>;
}

export function createEntityRegistry(): EntityRegistry {
  return { entries: new Map() };
}

export function registerEntity(
  registry: EntityRegistry,
  entity: FederationEntity
): EntityRegistry {
  const parsed = EntityRegistryEntrySchema.parse({
    ...entity,
    resolverRegistered: false,
  });
  const next = new Map(registry.entries);
  next.set(parsed.typeName, parsed);
  return { entries: next };
}

export function markResolverRegistered(
  registry: EntityRegistry,
  typeName: string
): EntityRegistry {
  const entry = registry.entries.get(typeName);
  if (!entry) {
    throw new Error(`Entity not found in registry: ${typeName}`);
  }
  const next = new Map(registry.entries);
  next.set(typeName, { ...entry, resolverRegistered: true });
  return { entries: next };
}

export function getEntity(
  registry: EntityRegistry,
  typeName: string
): EntityRegistryEntry | undefined {
  return registry.entries.get(typeName);
}

export function listEntities(registry: EntityRegistry): ReadonlyArray<EntityRegistryEntry> {
  return Array.from(registry.entries.values());
}

export function entitiesBySubgraph(
  registry: EntityRegistry,
  subgraphName: string
): ReadonlyArray<EntityRegistryEntry> {
  return listEntities(registry).filter((e) => e.subgraphName === subgraphName);
}

export function unregisteredResolvers(
  registry: EntityRegistry
): ReadonlyArray<EntityRegistryEntry> {
  return listEntities(registry).filter((e) => !e.resolverRegistered);
}

export function entitySdlFragment(entity: FederationEntity): string {
  const keyFields = entity.keyFields.join(" ");
  const externalMark = entity.external ? " @external" : "";
  const requiresFields = entity.requires.length > 0
    ? ` @requires(fields: "${entity.requires.join(" ")}")`
    : "";
  const providesFields = entity.provides.length > 0
    ? ` @provides(fields: "${entity.provides.join(" ")}")`
    : "";
  return `type ${entity.typeName} @key(fields: "${keyFields}")${externalMark}${requiresFields}${providesFields}`;
}
