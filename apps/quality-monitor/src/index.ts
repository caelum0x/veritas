// Public surface of @veritas/quality-monitor.

export type { MonitorConfig } from "./config.js";
export { MonitorConfigSchema, DEFAULT_CONFIG } from "./config.js";

export type { GateSnapshot, Collector, CollectorState } from "./collector.js";
export { createCollector } from "./collector.js";

export type { TrendPoint, GateTrend } from "./trends.js";
export { computeGateTrend, computeAllTrends } from "./trends.js";

export type { QualityAlert, AlertStore, AlertOptions } from "./alerts.js";
export { createAlertStore } from "./alerts.js";

export type { MonitorSnapshot, QualityMonitor } from "./monitor.js";
export { createQualityMonitor } from "./monitor.js";

export type { SampleRecord, Sampler } from "./sampler.js";
export { createSampler } from "./sampler.js";

export type { GateSummary, QualityDashboardData, QualityDashboardDeps } from "./dashboard.js";
export { buildQualityDashboard } from "./dashboard.js";

export type { MonitorBundle } from "./bootstrap.js";
export { bootstrap } from "./bootstrap.js";
