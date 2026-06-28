// Query/Mutation root wiring: merges all domain resolver maps into one root map.
import type { ResolverMap } from "./execute.js";
import { claimResolvers } from "./resolvers/claim.resolver.js";

/** Merge multiple ResolverMaps, combining per-type entries. */
function mergeResolvers(...maps: ResolverMap[]): ResolverMap {
  const merged: ResolverMap = {};
  for (const map of maps) {
    for (const [typeName, fields] of Object.entries(map)) {
      if (merged[typeName] === undefined) {
        merged[typeName] = {};
      }
      Object.assign(merged[typeName], fields);
    }
  }
  return merged;
}

/** Assembled root resolver map for the full GraphQL schema. */
export const rootResolvers: ResolverMap = mergeResolvers(
  claimResolvers,
);
