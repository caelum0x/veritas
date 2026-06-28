// Verdict resolvers: Query and field resolvers for VerdictRecord.
import type { VerdictRecord, Citation } from "@veritas/contracts";
import type { Resolver, ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import type { Connection, ConnectionArgs } from "../pagination.js";
import { notFound } from "../errors.js";

interface VerdictQueryArgs {
  readonly id: string;
}

interface VerdictsQueryArgs extends ConnectionArgs {
  readonly claimId?: string;
}

const verdict: Resolver<VerdictQueryArgs, VerdictRecord | null> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  const loaded = await ctx.loaders.verdict.load(args.id);
  return loaded ?? null;
};

const verdicts: Resolver<VerdictsQueryArgs, Connection<VerdictRecord>> = async (
  _parent,
  _args,
  _ctx: GqlContext,
) => {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    totalCount: 0,
  };
};

/** Field resolver: load Citation objects from citationIds via the citation DataLoader. */
const citationsField: Resolver<Record<string, never>, Citation[]> = async (
  parent: unknown,
  _args,
  ctx: GqlContext,
) => {
  const record = parent as VerdictRecord;
  if (!record.citationIds || record.citationIds.length === 0) return [];

  const results = await ctx.loaders.citation.loadMany(record.citationIds);
  const citations: Citation[] = [];
  for (const r of results) {
    if (r instanceof Error || r === null) continue;
    citations.push(r);
  }
  return citations;
};

export const verdictResolvers: ResolverMap = {
  Query: {
    verdict: verdict as unknown as Resolver,
    verdicts: verdicts as unknown as Resolver,
  },
  Verdict: {
    id: (parent: unknown) => (parent as VerdictRecord).id,
    claimId: (parent: unknown) => (parent as VerdictRecord).claimId,
    verdict: (parent: unknown) => (parent as VerdictRecord).verdict,
    confidence: (parent: unknown) => (parent as VerdictRecord).confidence,
    reasoning: (parent: unknown) => (parent as VerdictRecord).reasoning,
    citationIds: (parent: unknown) => (parent as VerdictRecord).citationIds,
    citations: citationsField as unknown as Resolver,
    createdAt: (parent: unknown) => (parent as VerdictRecord).createdAt,
    updatedAt: (parent: unknown) => (parent as VerdictRecord).updatedAt,
  },
};
