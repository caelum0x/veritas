// Re-exports the public surface of @veritas/compliance-reporting.

// Shared value types (ReportStatus, GapSeverity, ControlComplianceStatus, etc.)
export * from "./types.js";

// Framework registry
export * from "./framework.js";

// Compliance report domain model
export * from "./report.js";

// Report generator
export * from "./generator.js";

// Control-to-requirement mappings
export * from "./mapping.js";

// Gap analysis
export * from "./gap-analysis.js";

// Scorecard — ScorecardControlResult/ScorecardControlResultSchema avoid name collision with report.ts ControlResult
export {
  ScorecardControlResultSchema,
  type ScorecardControlResult,
  ScorecardSchema,
  type Scorecard,
  CreateScorecardInputSchema,
  type CreateScorecardInput,
  buildScorecard,
  ScorecardStore,
} from "./scorecard.js";

// Evidence links
export * from "./evidence-link.js";

// Reporting schedules
export * from "./schedule.js";

// Domain errors
export * from "./errors.js";
