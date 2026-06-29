// Minimal GraphQL executor that dispatches to a typed resolver map
import { AppError } from "@veritas/core";
import type { GqlContext } from "./context.js";
import { toGraphQLError } from "./errors.js";

/** A single field resolver function. */
export type Resolver<TArgs = Record<string, unknown>, TReturn = unknown> = (
  parent: unknown,
  args: TArgs,
  ctx: GqlContext,
  info: FieldInfo,
) => Promise<TReturn> | TReturn;

/** Minimal field info passed to resolvers. */
export interface FieldInfo {
  readonly fieldName: string;
  readonly parentType: string;
  readonly path: readonly string[];
}

/** Nested resolver map: { TypeName: { fieldName: Resolver } } */
export type ResolverMap = Record<string, Record<string, Resolver>>;

/** Result of a GraphQL execution. */
export interface ExecutionResult {
  readonly data: Record<string, unknown> | null;
  readonly errors?: ReadonlyArray<{ message: string; path?: readonly string[]; extensions?: Record<string, unknown> }>;
}

/** Invoke a resolver from the map for a given type and field. */
export async function invokeResolver(
  resolvers: ResolverMap,
  typeName: string,
  fieldName: string,
  parent: unknown,
  args: Record<string, unknown>,
  ctx: GqlContext,
  path: readonly string[],
): Promise<unknown> {
  const typeResolvers = resolvers[typeName];
  if (typeResolvers === undefined) {
    throw new Error(`No resolvers registered for type "${typeName}"`);
  }
  const resolver = typeResolvers[fieldName];
  if (resolver === undefined) {
    throw new Error(`No resolver for "${typeName}.${fieldName}"`);
  }
  const info: FieldInfo = { fieldName, parentType: typeName, path };
  return resolver(parent, args, ctx, info);
}

/** Execute a root operation against registered resolvers and return a GQL result. */
export async function executeOperation(
  resolvers: ResolverMap,
  rootType: "Query" | "Mutation",
  fieldName: string,
  args: Record<string, unknown>,
  ctx: GqlContext,
): Promise<ExecutionResult> {
  try {
    const value = await invokeResolver(resolvers, rootType, fieldName, null, args, ctx, [fieldName]);
    return { data: { [fieldName]: value } };
  } catch (err: unknown) {
    const gqlErr = toGraphQLError(err instanceof Error ? err : new Error(String(err)));
    return { data: null, errors: [{ message: gqlErr.message, path: gqlErr.path as readonly string[] | undefined, extensions: gqlErr.extensions as Record<string, unknown> | undefined }] };
  }
}
