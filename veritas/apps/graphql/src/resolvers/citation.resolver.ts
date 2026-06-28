// Citation resolvers: Query, Mutation, and field resolvers for Citation.
import type { Citation } from "@veritas/contracts";
import type { Resolver, ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import type { Connection, ConnectionArgs } from "../pagination.js";
import { pageToConnection, connectionArgsToPageRequest } from "../pagination.js";
import { notFound } from "../errors.js";

interface CitationQueryArgs {
  readonly id: string;
}

interface CitationsQueryArgs extends ConnectionArgs {
  readonly claimId?: string;
}

interface CreateCitationArgs {
  readonly input: {
    readonly sourceId: string;
    readonly url: string;
    readonly title?: string | null;
    readonly quote?: string | null;
    readonly relevance: number;
    readonly supports: boolean;
  };
}

interface UpdateCitationArgs {
  readonly id: string;
  readonly input: {
    readonly sourceId?: string;
    readonly url?: string;
    readonly title?: string | null;
    readonly quote?: string | null;
    readonly relevance?: number;
    readonly supports?: boolean;
  };
}

interface DeleteCitationArgs {
  readonly id: string;
}

const citation: Resolver<CitationQueryArgs, Citation | null> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  const loaded = await ctx.loaders.citation.load(args.id);
  return loaded ?? null;
};

const citations: Resolver<CitationsQueryArgs, Connection<Citation>> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  if (!ctx.serviceCtx) throw notFound("ServiceContext", "missing");

  const pageRequest = connectionArgsToPageRequest(args);
  const filter = args.claimId ? { claimId: args.claimId } : {};

  // Fetch via the loader cache by priming with a list call.
  // Since no CitationService exists, we return an empty connection
  // and rely on parent-context resolvers to provide embedded citation lists.
  void filter;
  void pageRequest;

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

const createCitation: Resolver<CreateCitationArgs, Citation> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  if (!ctx.serviceCtx) throw notFound("ServiceContext", "missing");
  void args;
  throw new Error("createCitation mutation requires a CitationService integration");
};

const updateCitation: Resolver<UpdateCitationArgs, Citation> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  if (!ctx.serviceCtx) throw notFound("ServiceContext", "missing");
  const existing = await ctx.loaders.citation.load(args.id);
  if (!existing) throw notFound("Citation", args.id);
  throw new Error("updateCitation mutation requires a CitationService integration");
};

const deleteCitation: Resolver<DeleteCitationArgs, boolean> = async (
  _parent,
  args,
  ctx: GqlContext,
) => {
  if (!ctx.serviceCtx) throw notFound("ServiceContext", "missing");
  const existing = await ctx.loaders.citation.load(args.id);
  if (!existing) throw notFound("Citation", args.id);
  throw new Error("deleteCitation mutation requires a CitationService integration");
};

export const citationResolvers: ResolverMap = {
  Query: {
    citation: citation as unknown as Resolver,
    citations: citations as unknown as Resolver,
  },
  Mutation: {
    createCitation: createCitation as unknown as Resolver,
    updateCitation: updateCitation as unknown as Resolver,
    deleteCitation: deleteCitation as unknown as Resolver,
  },
  Citation: {
    id: (parent: unknown) => (parent as Citation).id,
    sourceId: (parent: unknown) => (parent as Citation).sourceId,
    url: (parent: unknown) => (parent as Citation).url,
    title: (parent: unknown) => (parent as Citation).title,
    quote: (parent: unknown) => (parent as Citation).quote,
    relevance: (parent: unknown) => (parent as Citation).relevance,
    supports: (parent: unknown) => (parent as Citation).supports,
    createdAt: (parent: unknown) => (parent as Citation).createdAt,
    updatedAt: (parent: unknown) => (parent as Citation).updatedAt,
  },
};
