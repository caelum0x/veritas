// Wire together the quality-monitor service components into a ready-to-use instance.

import { createCollector } from "./collector.js";
import { createAlertStore } from "./alerts.js";
import { createQualityMonitor } from "./monitor.js";
import { createSampler } from "./sampler.js";
import { DEFAULT_CONFIG, type MonitorConfig } from "./config.js";
import type { QualityMonitor } from "./monitor.js";
import type { Sampler } from "./sampler.js";

export interface MonitorBundle {
  readonly monitor: QualityMonitor;
  readonly sampler: Sampler;
}

export function bootstrap(config: MonitorConfig = DEFAULT_CONFIG): MonitorBundle {
  const collector = createCollector(config.trendWindowSize);
  const alertStore = createAlertStore(config.maxAlerts);
  const monitor = createQualityMonitor(collector, alertStore, config);
  const sampler = createSampler(config.sampleRate);

  return { monitor, sampler };
}
