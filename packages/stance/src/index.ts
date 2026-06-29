// Public surface of @veritas/stance — re-exports all stance detection modules
export type { Stance } from "./stance.js";
export { StanceSchema, fromEvidenceStance, invertStance, stanceToNumber, numberToStance } from "./stance.js";

export type { StanceConfidence, CitationStance, AggregatedStance, StanceContext, WeightedStance, DisagreementReport, ScoredStance } from "./types.js";
export { StanceConfidenceSchema } from "./types.js";

export { StanceDetectionError, StanceLLMError, StanceParseError, StanceWeightError, StanceAggregationError } from "./errors.js";

export type { LLMStancePort } from "./llm-stance.js";
export { LLMStanceAdapter, MockLLMStanceAdapter } from "./llm-stance.js";

export type { CitationInput } from "./evidence-stance.js";
export { classifyCitationStance, classifyAllCitationStances } from "./evidence-stance.js";

export { aggregateStances, partitionByStance } from "./aggregate.js";
