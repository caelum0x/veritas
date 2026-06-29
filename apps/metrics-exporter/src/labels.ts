// Helpers for serializing and validating Prometheus label sets.

import type { Labels } from "@veritas/observability";

const LABEL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Escape a label value per the Prometheus text format spec. */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

/** Sanitise a metric name: replace characters not in [a-zA-Z0-9_:] with `_`. */
export function escapeMetricName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_:]/g, "_");
}

/** Return true if the label name is valid per Prometheus naming rules. */
export function isValidLabelName(name: string): boolean {
  return LABEL_NAME_RE.test(name) && !name.startsWith("__");
}

/** Filter out invalid label names and return a sanitised copy. */
export function sanitiseLabels(labels: Labels): Labels {
  return Object.fromEntries(
    Object.entries(labels).filter(([k]) => isValidLabelName(k))
  );
}

/** Merge static global labels with per-sample labels (sample labels take precedence). */
export function mergeLabels(global: Labels, sample: Labels): Labels {
  return { ...global, ...sample };
}

/** Render a label set to Prometheus `{k="v",...}` notation, or `""` when empty. */
export function renderLabels(labels: Labels): string {
  const entries = Object.entries(sanitiseLabels(labels));
  if (entries.length === 0) return "";
  const pairs = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
    .join(",");
  return `{${pairs}}`;
}

/** Apply a metric name prefix, separated by `_`. */
export function applyPrefix(prefix: string, name: string): string {
  if (!prefix) return escapeMetricName(name);
  return `${escapeMetricName(prefix)}_${escapeMetricName(name)}`;
}
