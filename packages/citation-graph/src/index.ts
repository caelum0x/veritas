// Public surface of @veritas/citation-graph: re-exports all submodules.

export type {
  NodeKind,
  EdgeKind,
  GraphNodeBase,
  ClaimNode,
  SourceNode,
  EvidenceNode,
  GraphNode,
  GraphEdge,
  CitationGraph,
} from "./types.js";

export {
  GraphNodeNotFoundError,
  GraphEdgeNotFoundError,
  DuplicateNodeError,
  DuplicateEdgeError,
  GraphCycleError,
  GraphQueryError,
} from "./errors.js";

export {
  emptyGraph,
  addNode,
  addEdge,
  getNode,
  getEdge,
  getNeighbors,
  getPredecessors,
  nodeCount,
  edgeCount,
  allNodes,
  allEdges,
  edgesBetween,
} from "./graph.js";

export {
  makeClaimNode,
  makeSourceNode,
  makeEvidenceNode,
} from "./node.js";

export {
  makeEdge,
  makeCitesEdge,
  makeSupportsEdge,
  makeRefutesEdge,
  makeNeutralEdge,
  edgeKindFromStance,
} from "./edge.js";

export type { BuildInput } from "./builder.js";
export {
  GraphBuildError,
  buildGraphFromReport,
} from "./builder.js";

export type { CentralityScores } from "./centrality.js";
export {
  computeInDegree,
  computePageRank,
  computeAuthority,
  computeCentrality,
  topNodesByPageRank,
} from "./centrality.js";

export type { DiversityBreakdown } from "./diversity.js";
export {
  diversityScore,
} from "./diversity.js";

export type { SourceCluster, ClusterResult } from "./cluster.js";
export {
  clusterSources,
  largestClusters,
} from "./cluster.js";

export type { PathStep, EvidencePath } from "./path.js";
export {
  findShortestPath,
  findAllPaths,
} from "./path.js";

export type { DotExportOptions } from "./export-dot.js";
export {
  exportDot,
} from "./export-dot.js";

export type { GraphMetrics } from "./metrics.js";
export {
  computeMetrics,
  formatMetrics,
} from "./metrics.js";

export {
  nodesByKind,
  edgesByKind,
  outgoingEdges,
  incomingEdges,
  bfsFrom,
  dfsFrom,
  inducedSubgraph,
  reachableFrom,
  ancestorsOf,
  shortestPaths,
  edgesAboveWeight,
  sourcesForClaim,
  claimsForSource,
} from "./query.js";
