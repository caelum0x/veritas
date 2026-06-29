// index.ts: public surface of the @veritas/contradiction module.
export type { ClaimText, ClaimPair } from "./pair.js";
export { makePair, withScore } from "./pair.js";

export type { NliRelation, NliScore } from "./relation.js";
export { isContradiction, isEntailment, isNeutral } from "./relation.js";

export type { NliPort, NliOptions } from "./nli-port.js";
export { MockNli } from "./nli-port.js";

export { LlmNli } from "./llm-nli.js";

export type { ContradictionCluster } from "./cluster.js";
export { clusterContradictions } from "./cluster.js";

export type { SeverityLevel, ContradictionScore } from "./scoring.js";
export { scorePair, scoreCluster, compareSeverity } from "./scoring.js";

export type {
  ContradictionSeverity,
  ContradictionStatus,
  Contradiction,
  DetectionContext,
  DetectionResult,
  ContradictionExplanation,
} from "./types.js";
export { contradictionSeveritySchema, contradictionStatusSchema } from "./types.js";

export { detectContradictions } from "./detector.js";

export type {
  MatrixCell,
  PairwiseMatrix,
  MatrixOptions,
} from "./matrix.js";
export {
  buildPairwiseMatrix,
  getContradictingCells,
  lookupCell,
  summarizeMatrix,
} from "./matrix.js";

export type {
  ContradictionExplanation as PairExplanationResult,
  ExplainerPort,
} from "./explain.js";
export {
  templateExplainPair,
  templateExplainCluster,
  TemplateExplainer,
} from "./explain.js";

export type {
  ResolutionStatus,
  ContradictionFlag,
  ResolveOptions,
} from "./resolver.js";
export {
  flagCluster,
  escalateFlag,
  resolveFlag,
  dismissFlag,
  flagAll,
} from "./resolver.js";

export {
  NliClassificationError,
  ContradictionNotFoundError,
  ClusteringError,
  ExplanationError,
  TooManyPairsError,
  InvalidClaimError,
  MatrixBuildError,
  NliError,
  ContradictionDetectorError,
  ConsistencyGraphError,
} from "./errors.js";
