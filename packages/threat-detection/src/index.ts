// Re-exports the full public surface of the threat-detection module.

export type { RiskLevel, ThreatContext, RiskScore, DetectionResult, ThreatSignal } from "./types.js";

export {
  ThreatDetectionError,
  BlocklistError,
  RuleEvaluationError,
  VelocityBreachError,
} from "./errors.js";

export type { SecurityEventKind, SecurityEvent } from "./event.js";
export { makeSecurityEvent, isHighSeverity, serializeEvent } from "./event.js";

export type { ResponseAction, ResponsePolicy, ResponseHandler } from "./response.js";
export {
  defaultPolicies,
  resolveActions,
  createLoggingResponseHandler,
} from "./response.js";

export type { Rule } from "./rules.js";
export {
  defaultRules,
  evaluateRules,
  registerRule,
} from "./rules.js";

export { computeRiskScore, mergeScores, scoreFromWeightedMax } from "./score.js";

export type { BlocklistKind, BlocklistEntry, Blocklist } from "./blocklist.js";
export {
  createBlocklist,
  blockIp,
  blockUserId,
  blockUserAgent,
} from "./blocklist.js";

export type { VelocityWindow, VelocityResult, VelocityChecker } from "./velocity.js";
export {
  DEFAULT_WINDOWS,
  createVelocityChecker,
} from "./velocity.js";

export type { AnomalyDetector, AnomalyResult, AnomalySignal } from "./anomaly.js";
export { createAnomalyDetector } from "./anomaly.js";

export type { AbuseDetector, AbuseResult, AbuseSignal } from "./abuse.js";
export { createAbuseDetector } from "./abuse.js";

export type { FraudSignalResult, FraudIndicator } from "./fraud-signal.js";
export { detectFraudSignals, parseFraudIndicator } from "./fraud-signal.js";

export type { ThreatDetector, ThreatDetectorOptions } from "./detector.js";
export { createThreatDetector } from "./detector.js";
