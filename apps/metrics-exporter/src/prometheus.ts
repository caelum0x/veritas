// Renders MetricSample collections into Prometheus text exposition format (0.0.4).

import type { MetricSample } from "@veritas/observability";
import { renderLabels, escapeMetricName } from "./labels.js";
import { formatNumber, formatTimestamp } from "./format.js";

const CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";

export { CONTENT_TYPE };

interface MetricGroup {
  kind: "counter" | "gauge" | "histogram";
  description: string;
  samples: MetricSample[];
}

function groupSamples(samples: readonly MetricSample[]): Map<string, MetricGroup> {
  const groups = new Map<string, MetricGroup>();
  for (const sample of samples) {
    const baseName = sample.name
      .replace(/_count$/, "")
      .replace(/_sum$/, "");
    const existing = groups.get(baseName);
    if (existing) {
      existing.samples.push(sample);
    } else {
      groups.set(baseName, {
        kind: sample.kind,
        description: "",
        samples: [sample],
      });
    }
  }
  return groups;
}

function renderSampleLine(sample: MetricSample): string {
  const name = escapeMetricName(sample.name);
  const labels = renderLabels(sample.labels);
  const value = formatNumber(sample.value);
  const ts = formatTimestamp(sample.timestamp);
  return `${name}${labels} ${value} ${ts}`;
}

/** Convert a flat list of MetricSamples into Prometheus text format. */
export function renderPrometheusText(samples: readonly MetricSample[]): string {
  const groups = groupSamples(samples);
  const lines: string[] = [];

  for (const [baseName, group] of groups) {
    const safeBase = escapeMetricName(baseName);
    lines.push(`# HELP ${safeBase} ${group.description}`);
    lines.push(`# TYPE ${safeBase} ${group.kind}`);
    for (const s of group.samples) {
      lines.push(renderSampleLine(s));
    }
  }

  // Prometheus expects a trailing newline.
  return lines.join("\n") + "\n";
}
