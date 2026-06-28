// Re-exports the full public surface of the @veritas/capacity package.
export {
  ResourceKindSchema,
  CapacityTierSchema,
  ThresholdSchema,
  DEFAULT_THRESHOLD,
  ResourceSchema,
  CapacityModelSchema,
  classifyUtilization,
  validateModel,
  resourceName,
} from "./capacity-model.js";
export type {
  ResourceName,
  ResourceKind,
  CapacityTier,
  Threshold,
  Resource,
  CapacityModel,
} from "./capacity-model.js";

export {
  CapacityModelError,
  InsufficientDataError,
  ForecastError,
  SaturationError,
  RecommendationError,
} from "./errors.js";

export { forecastUtilization } from "./forecast.js";
export type { ForecastPoint } from "./forecast.js";

export {
  InMemoryMetricSource,
  samplesToUtilization,
  averageUtilization,
  peakUtilization,
} from "./load.js";
export type { MetricSource } from "./load.js";

export {
  TimeWindowSchema,
  MetricSampleSchema,
  UtilizationPointSchema,
  TrendDirectionSchema,
  ScalingActionSchema,
  SaturationStatusSchema,
  SaturationResultSchema,
  ScalingRecommendationSchema,
  CapacityReportSchema,
} from "./types.js";
export type {
  TimeWindow,
  MetricSample,
  UtilizationPoint,
  TrendDirection,
  ScalingAction,
  SaturationStatus,
  SaturationResult,
  ScalingRecommendation,
  CapacityReport,
} from "./types.js";
