// Public surface of the @veritas/metrics-exporter package.

export type { ExporterConfig } from "./config.js";
export { loadConfig } from "./config.js";

export type { CollectedMetrics } from "./collector.js";
export { collectAll, makeCollector } from "./collector.js";

export type { Exporter, ExporterOptions } from "./exporter.js";
export { createExporter } from "./exporter.js";

export { renderPrometheusText, CONTENT_TYPE } from "./prometheus.js";

export type { ServerHandle } from "./server.js";
export { startServer } from "./server.js";

export {
  escapeLabelValue,
  escapeMetricName,
  isValidLabelName,
  sanitiseLabels,
  mergeLabels,
  renderLabels,
  applyPrefix,
} from "./labels.js";

export { formatNumber, formatTimestamp, clampBucketCount } from "./format.js";
