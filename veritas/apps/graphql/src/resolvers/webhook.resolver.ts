// Webhook resolvers: Query, Mutation, and field resolvers for the Webhook type.
import type { Webhook } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface WebhookQueryArgs {
  id: string;
}

interface WebhooksQueryArgs {
  organizationId?: string | null;
  first?: number | null;
  after?: string | null;
}

interface CreateWebhookArgs {
  input: {
    organizationId: string;
    url: string;
    events: string[];
    description?: string | null;
  };
}

interface UpdateWebhookArgs {
  id: string;
  input: {
    url?: string | null;
    events?: string[] | null;
    active?: boolean | null;
    description?: string | null;
  };
}

interface DeleteWebhookArgs {
  id: string;
}

interface PingWebhookArgs {
  id: string;
}

async function resolveWebhook(
  _parent: unknown,
  args: WebhookQueryArgs,
  ctx: GqlContext,
): Promise<Webhook | null> {
  return ctx.loaders.webhook.load(args.id);
}

async function resolveWebhooks(
  _parent: unknown,
  args: WebhooksQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Webhook>> {
  const pageReq = connectionArgsToPageRequest({ first: args.first, after: args.after });
  void pageReq;
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
}

async function createWebhook(
  _parent: unknown,
  args: CreateWebhookArgs,
  ctx: GqlContext,
): Promise<Webhook> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createWebhook not yet delegated: url="${args.input.url}"`),
  );
}

async function updateWebhook(
  _parent: unknown,
  args: UpdateWebhookArgs,
  ctx: GqlContext,
): Promise<Webhook> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.webhook.load(args.id);
  if (existing === null) {
    throw notFound("Webhook", args.id);
  }
  throw toGraphQLError(new Error(`updateWebhook not yet delegated for id="${args.id}"`));
}

async function deleteWebhook(
  _parent: unknown,
  args: DeleteWebhookArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.webhook.load(args.id);
  if (existing === null) {
    throw notFound("Webhook", args.id);
  }
  throw toGraphQLError(new Error(`deleteWebhook not yet delegated for id="${args.id}"`));
}

async function pingWebhook(
  _parent: unknown,
  args: PingWebhookArgs,
  ctx: GqlContext,
): Promise<boolean> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const existing = await ctx.loaders.webhook.load(args.id);
  if (existing === null) {
    throw notFound("Webhook", args.id);
  }
  throw toGraphQLError(new Error(`pingWebhook not yet delegated for id="${args.id}"`));
}

export const webhookResolvers: ResolverMap = {
  Query: {
    webhook: resolveWebhook as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    webhooks: resolveWebhooks as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createWebhook: createWebhook as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    updateWebhook: updateWebhook as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    deleteWebhook: deleteWebhook as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    pingWebhook: pingWebhook as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
};
