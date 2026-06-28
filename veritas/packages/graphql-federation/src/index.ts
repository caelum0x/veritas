// Public surface re-export for @veritas/graphql-federation.
export type {
  SubgraphCapability,
  Subgraph,
  CreateSubgraph,
  SubgraphDefinition,
} from "./subgraph.js";
export {
  SubgraphCapabilitySchema,
  SubgraphSchema,
  CreateSubgraphSchema,
  defineSubgraph,
  subgraphEntityNames,
  subgraphHasCapability,
  mergeSubgraphMetadata,
} from "./subgraph.js";

export type { ComposeOptions } from "./supergraph.js";
export {
  ComposeOptionsSchema,
  composeSupergraph,
  supergraphToDescriptor,
  validateSupergraphConfig,
} from "./supergraph.js";

export type {
  FederationKey,
  FederationEntity,
  QueryPlanNodeKind,
  FetchNode,
  FlattenNode,
  ParallelNode,
  SequenceNode,
  DeferNode,
  QueryPlanNode,
  SupergraphConfig,
  ReferenceResolverContext,
  ReferenceResolverFn,
  StitchingLink,
} from "./types.js";
export {
  FederationKeySchema,
  FederationEntitySchema,
  QueryPlanNodeKindSchema,
  StitchingLinkSchema,
} from "./types.js";
