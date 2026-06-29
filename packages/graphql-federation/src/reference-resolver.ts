// Reference resolver: maps __typename + key fields to entity objects for federation __resolveReference.
import { z } from "zod";
import type { ReferenceResolverFn, ReferenceResolverContext } from "./types.js";
import { keyMatchesRepresentation } from "./key.js";
import type { FederationKey } from "./types.js";

export interface ResolverEntry<T = Record<string, unknown>> {
  readonly typeName: string;
  readonly subgraphName: string;
  readonly keys: ReadonlyArray<FederationKey>;
  readonly resolve: ReferenceResolverFn<T>;
}

export interface ReferenceResolverRegistry {
  readonly resolvers: ReadonlyMap<string, ResolverEntry>;
}

export function createReferenceResolverRegistry(): ReferenceResolverRegistry {
  return { resolvers: new Map() };
}

export function registerReferenceResolver<T = Record<string, unknown>>(
  registry: ReferenceResolverRegistry,
  entry: ResolverEntry<T>
): ReferenceResolverRegistry {
  const next = new Map(registry.resolvers);
  next.set(entry.typeName, entry as ResolverEntry);
  return { resolvers: next };
}

export async function resolveReference(
  registry: ReferenceResolverRegistry,
  representation: Record<string, unknown>,
  subgraphName: string
): Promise<Record<string, unknown> | null> {
  const typename = representation["__typename"];
  if (typeof typename !== "string") return null;

  const entry = registry.resolvers.get(typename);
  if (!entry) return null;
  if (entry.subgraphName !== subgraphName) return null;

  const matchingKey = entry.keys.find((k) => keyMatchesRepresentation(k, representation));
  if (!matchingKey) return null;

  const context: ReferenceResolverContext = {
    subgraphName,
    typename,
    representation,
  };

  return entry.resolve(representation, context);
}

export async function resolveReferences(
  registry: ReferenceResolverRegistry,
  representations: ReadonlyArray<Record<string, unknown>>,
  subgraphName: string
): Promise<ReadonlyArray<Record<string, unknown> | null>> {
  return Promise.all(
    representations.map((rep) => resolveReference(registry, rep, subgraphName))
  );
}

export const RepresentationSchema = z.object({
  __typename: z.string().min(1),
}).catchall(z.unknown());
export type Representation = z.infer<typeof RepresentationSchema>;

export function validateRepresentations(
  input: unknown
): ReadonlyArray<Representation> {
  const arr = z.array(RepresentationSchema).parse(input);
  return Object.freeze(arr);
}

export function listRegisteredTypes(
  registry: ReferenceResolverRegistry
): ReadonlyArray<string> {
  return Array.from(registry.resolvers.keys());
}
