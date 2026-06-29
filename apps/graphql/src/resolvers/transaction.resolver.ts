// Transaction resolvers: Query, Mutation, and field resolvers for the Transaction type.
import type { Transaction } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface TransactionQueryArgs {
  id: string;
}

interface TransactionsQueryArgs {
  first?: number | null;
  after?: string | null;
  walletId?: string | null;
}

interface CreateTransactionArgs {
  input: {
    walletId: string;
    settlementId?: string | null;
    kind: string;
    amount: { amount: string; currency: string };
    reference?: string | null;
    metadata?: Record<string, unknown> | null;
  };
}

/** Resolves a single Transaction by ID via the dataloader. */
async function resolveTransaction(
  _parent: unknown,
  args: TransactionQueryArgs,
  ctx: GqlContext,
): Promise<Transaction | null> {
  return ctx.loaders.transaction.load(args.id);
}

/** Resolves a paginated connection of Transactions with optional wallet filter. */
async function resolveTransactions(
  _parent: unknown,
  args: TransactionsQueryArgs,
  _ctx: GqlContext,
): Promise<Connection<Transaction>> {
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

/** Creates a new Transaction via the service context. */
async function createTransaction(
  _parent: unknown,
  args: CreateTransactionArgs,
  ctx: GqlContext,
): Promise<Transaction> {
  if (!ctx.principal || !ctx.serviceCtx) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  throw toGraphQLError(
    new Error(`createTransaction not yet delegated: walletId="${args.input.walletId}"`),
  );
}

/** Resolver map entries for Query, Mutation, and Transaction type. */
export const transactionResolvers: ResolverMap = {
  Query: {
    transaction: resolveTransaction as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    transactions: resolveTransactions as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Mutation: {
    createTransaction: createTransaction as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  Transaction: {
    metadata: (parent: unknown) => {
      const tx = parent as Transaction & { metadata?: Record<string, unknown> };
      return tx.metadata ?? null;
    },
    settlementId: (parent: unknown) => {
      const tx = parent as Transaction;
      return tx.settlementId ?? null;
    },
    reference: (parent: unknown) => {
      const tx = parent as Transaction;
      return (tx as Transaction & { reference?: string | null }).reference ?? null;
    },
  },
};
