// Relay-style cursor pagination helpers for GraphQL connections
import { encodeCursor, decodeCursor, makePage } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";

export interface Edge<T> {
  readonly cursor: string;
  readonly node: T;
}

export interface PageInfo {
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startCursor: string | null;
  readonly endCursor: string | null;
}

export interface Connection<T> {
  readonly edges: readonly Edge<T>[];
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface ConnectionArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

export function connectionArgsToPageRequest(args: ConnectionArgs): PageRequest {
  const limit = args.first ?? args.last ?? 20;
  const cursor = args.after ?? args.before ?? undefined;
  return { limit: Math.min(limit, 100), cursor };
}

export function pageToConnection<T>(
  page: Page<T>,
  idOf: (item: T) => string
): Connection<T> {
  const edges: Edge<T>[] = page.items.map((node) => ({
    cursor: encodeCursor({ id: idOf(node) }),
    node,
  }));

  const startCursor = edges.length > 0 ? (edges[0]?.cursor ?? null) : null;
  const endCursor = edges.length > 0 ? (edges[edges.length - 1]?.cursor ?? null) : null;

  return {
    edges,
    pageInfo: {
      hasNextPage: page.hasMore,
      hasPreviousPage: false,
      startCursor,
      endCursor,
    },
    totalCount: page.items.length,
  };
}

export function cursorToId(cursor: string): string {
  const result = decodeCursor(cursor);
  if (!result.ok) return cursor;
  const payload = result.value;
  return typeof payload["id"] === "string" ? payload["id"] : cursor;
}

export function buildConnection<T>(
  items: readonly T[],
  total: number,
  args: ConnectionArgs,
  idOf: (item: T) => string
): Connection<T> {
  const limit = args.first ?? args.last ?? 20;
  const hasNextPage = items.length === limit && total > limit;

  const page = makePage(
    items as T[],
    hasNextPage ? encodeCursor({ cursor: args.after ?? "" }) : null,
  );

  const edges: Edge<T>[] = page.items.map((node) => ({
    cursor: encodeCursor({ id: idOf(node) }),
    node,
  }));

  const startCursor = edges.length > 0 ? (edges[0]?.cursor ?? null) : null;
  const endCursor = edges.length > 0 ? (edges[edges.length - 1]?.cursor ?? null) : null;

  return {
    edges,
    pageInfo: {
      hasNextPage: page.hasMore,
      hasPreviousPage: args.after !== null && args.after !== undefined,
      startCursor,
      endCursor,
    },
    totalCount: total,
  };
}

export const pageInfoTypeDef = `
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }
`;

export function makeConnectionTypeDef(typeName: string): string {
  return `
  type ${typeName}Edge {
    cursor: String!
    node: ${typeName}!
  }

  type ${typeName}Connection {
    edges: [${typeName}Edge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`;
}
