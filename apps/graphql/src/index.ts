// Public re-exports for the @veritas/graphql package.

// Context
export type { GqlContext, Loaders, ContextFactory } from "./context.js";

// DataLoader
export { DataLoader, createLoader } from "./dataloader.js";
export type { BatchLoadFn, DataLoaderOptions } from "./dataloader.js";

// Errors
export {
  appErrorToGraphQL,
  toGraphQLError,
  formatError,
  notFound,
  conflict,
  validationError,
  unauthorized,
  forbidden,
  rateLimited,
  unavailable,
} from "./errors.js";
export type { GqlErrorExtensions } from "./errors.js";

// Execute
export { invokeResolver, executeOperation } from "./execute.js";
export type { Resolver, ResolverMap, ExecutionResult, FieldInfo } from "./execute.js";

// Pagination
export {
  connectionArgsToPageRequest,
  pageToConnection,
  cursorToId,
  buildConnection,
  pageInfoTypeDef,
  makeConnectionTypeDef,
} from "./pagination.js";
export type { Edge, PageInfo, Connection, ConnectionArgs } from "./pagination.js";

// Scalars
export { DateTimeScalar, JSONScalar, MoneyScalar, scalarResolvers } from "./scalars.js";

// Directives
export { AUTH_DIRECTIVE_SDL, applyAuthDirective } from "./directives.js";
export type { AuthDirectiveArgs } from "./directives.js";

// Root resolver map
export { rootResolvers } from "./root.js";

// Type definitions
export { claimTypeDefs } from "./types/claim.type.js";
export { citationTypeDefs } from "./types/citation.type.js";

// Resolvers
export { claimResolvers } from "./resolvers/claim.resolver.js";

// Loaders
export { createClaimLoader } from "./loaders/claim.loader.js";
export type { ClaimLoader } from "./loaders/claim.loader.js";
export { createCitationLoader } from "./loaders/citation.loader.js";
export type { CitationLoader } from "./loaders/citation.loader.js";
