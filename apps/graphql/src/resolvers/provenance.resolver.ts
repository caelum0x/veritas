// Provenance GraphQL resolvers: read-only access to tamper-evident report metadata.
import type { GqlContext } from "../context.js";
import type { Provenance } from "@veritas/contracts";
import { notFound } from "../errors.js";

interface ProvenanceArgs {
  readonly contentHash: string;
}

/** Root Query resolvers for the Provenance type. */
export const provenanceResolvers = {
  Query: {
    provenance: async (
      _parent: unknown,
      args: ProvenanceArgs,
      ctx: GqlContext,
    ): Promise<Provenance> => {
      const record = await ctx.loaders.provenance.load(args.contentHash);
      if (record === null) {
        throw notFound("Provenance", args.contentHash);
      }
      return record;
    },
  },

  Provenance: {
    id: (parent: Provenance): string => parent.contentHash,
  },
};
