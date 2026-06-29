// Public surface of @veritas/churn — churn prediction, risk scoring, and retention
export {
  SignalId,
  SignalKind,
  SignalWeightSchema,
  ChurnSignalSchema,
  ChurnSignal,
  SIGNAL_WEIGHTS,
  buildSignal,
  recentSignals,
  groupSignalsByAccount,
  newSignalId,
} from "./signal.js";

export type {
  RiskScore,
  RiskBand,
} from "./risk-score.js";

export {
  RiskScoreSchema,
  computeRiskScore,
  toBand,
  batchRiskScores,
} from "./risk-score.js";

export type {
  FeatureVector,
  AccountActivity,
} from "./features.js";

export {
  FeatureVectorSchema,
  extractFeatures,
  normalizeFeatures,
} from "./features.js";

export type {
  ChurnPrediction,
} from "./predictor.js";

export {
  ChurnPredictionSchema,
  predictChurn,
  batchPredictChurn,
} from "./predictor.js";

export type {
  Cohort,
} from "./cohort.js";

export {
  CohortSchema,
  buildCohorts,
  findAccountCohort,
  sortCohortsByRisk,
  filterBySize,
} from "./cohort.js";

export {
  triggerIntervention,
  updateInterventionStatus,
  listUserInterventions,
  getIntervention,
  expireStaleInterventions,
} from "./intervention.js";

export {
  computeHealthScore,
  getHealthScore,
} from "./health-score.js";

export type {
  ChurnStore,
} from "./store.js";

export {
  InMemoryChurnStore,
} from "./store.js";

export {
  ChurnSignalNotFoundError,
  RiskScoreNotFoundError,
  InterventionNotFoundError,
  InterventionAlreadyExistsError,
  HealthScoreNotFoundError,
  InvalidChurnSignalError,
  CohortNotFoundError,
} from "./errors.js";

export type {
  ChurnRisk,
  InterventionType,
  InterventionStatus,
  Intervention,
  AccountHealth,
  CohortMembership,
} from "./types.js";
