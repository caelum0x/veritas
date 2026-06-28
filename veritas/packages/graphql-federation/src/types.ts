// Core type definitions shared across the graphql-federation module.
import { z } from "zod";

export const FederationKeySchema = z.object({
  typeName: z.string().min(1),
  fields: z.string().min(1),
  resolvable: z.boolean().default(true),
});
export type FederationKey = z.infer<typeof FederationKeySchema>;

export const FederationEntitySchema = z.object({
  typeName: z.string().min(1),
  keyFields: z.array(z.string()).min(1),
  subgraphName: z.string().min(1),
  external: z.boolean().default(false),
  requires: z.array(z.string()).default([]),
  provides: z.array(z.string()).default([]),
});
export type FederationEntity = z.infer<typeof FederationEntitySchema>;

export const QueryPlanNodeKindSchema = z.enum([
  "Fetch",
  "Flatten",
  "Parallel",
  "Sequence",
  "Defer",
]);
export type QueryPlanNodeKind = z.infer<typeof QueryPlanNodeKindSchema>;

export interface FetchNode {
  readonly kind: "Fetch";
  readonly subgraphName: string;
  readonly query: string;
  readonly requires: ReadonlyArray<string>;
}

export interface FlattenNode {
  readonly kind: "Flatten";
  readonly path: ReadonlyArray<string>;
  readonly node: QueryPlanNode;
}

export interface ParallelNode {
  readonly kind: "Parallel";
  readonly nodes: ReadonlyArray<QueryPlanNode>;
}

export interface SequenceNode {
  readonly kind: "Sequence";
  readonly nodes: ReadonlyArray<QueryPlanNode>;
}

export interface DeferNode {
  readonly kind: "Defer";
  readonly primary: QueryPlanNode;
  readonly deferred: ReadonlyArray<QueryPlanNode>;
}

export type QueryPlanNode =
  | FetchNode
  | FlattenNode
  | ParallelNode
  | SequenceNode
  | DeferNode;

export interface SupergraphConfig {
  readonly name: string;
  readonly subgraphNames: ReadonlyArray<string>;
  readonly sdl: string;
  readonly version: string;
  readonly composedAt: string;
}

export interface ReferenceResolverContext {
  readonly subgraphName: string;
  readonly typename: string;
  readonly representation: Record<string, unknown>;
}

export type ReferenceResolverFn<T = Record<string, unknown>> = (
  representation: Record<string, unknown>,
  context: ReferenceResolverContext
) => Promise<T | null>;

export const StitchingLinkSchema = z.object({
  leftField: z.string().min(1),
  rightField: z.string().min(1),
  leftTypeName: z.string().min(1),
  rightTypeName: z.string().min(1),
  subgraphName: z.string().min(1),
});
export type StitchingLink = z.infer<typeof StitchingLinkSchema>;
