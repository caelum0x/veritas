// Anomaly detection — identifies statistically unusual patterns in request behaviour.

import type { ThreatContext } from "./types.js";
import { computeRiskScore } from "./score.js";
import type { RiskScore } from "./types.js";

export interface AnomalySignal {
  readonly label: string;
  readonly weight: number;
}

export interface AnomalyResult {
  readonly anomalyDetected: boolean;
  readonly riskScore: RiskScore;
  readonly signals: readonly AnomalySignal[];
}

/** Maintains per-entity baseline stats for anomaly detection. */
interface Baseline {
  requestCount: number;
  hourBuckets: Record<number, number>; // hour-of-day → count
  ipSet: Set<string>;
  uaSet: Set<string>;
}

function hourOf(ts: number): number {
  return new Date(ts).getUTCHours();
}

export interface AnomalyDetector {
  observe(ctx: ThreatContext): void;
  detect(ctx: ThreatContext): AnomalyResult;
}

export function createAnomalyDetector(
  unusualHourThreshold = 0.05 // fraction of total reqs below which an hour is "unusual"
): AnomalyDetector {
  const baselines = new Map<string, Baseline>();

  function entityKey(ctx: ThreatContext): string {
    return ctx.userId ?? ctx.ip ?? "global";
  }

  function getOrCreate(key: string): Baseline {
    let b = baselines.get(key);
    if (!b) {
      b = { requestCount: 0, hourBuckets: {}, ipSet: new Set(), uaSet: new Set() };
      baselines.set(key, b);
    }
    return b;
  }

  return {
    observe(ctx: ThreatContext): void {
      const key = entityKey(ctx);
      const b = getOrCreate(key);
      b.requestCount++;
      const h = hourOf(ctx.timestamp);
      b.hourBuckets[h] = (b.hourBuckets[h] ?? 0) + 1;
      if (ctx.ip) b.ipSet.add(ctx.ip);
      if (ctx.userAgent) b.uaSet.add(ctx.userAgent.toLowerCase());
    },

    detect(ctx: ThreatContext): AnomalyResult {
      const key = entityKey(ctx);
      const b = baselines.get(key);
      const signals: AnomalySignal[] = [];

      if (b && b.requestCount >= 20) {
        // Unusual hour detection
        const h = hourOf(ctx.timestamp);
        const hCount = b.hourBuckets[h] ?? 0;
        const fraction = hCount / b.requestCount;
        if (fraction < unusualHourThreshold) {
          signals.push(Object.freeze({ label: "UNUSUAL_HOUR", weight: 25 }));
        }

        // New IP for existing user
        if (ctx.ip && !b.ipSet.has(ctx.ip) && b.ipSet.size > 0) {
          signals.push(Object.freeze({ label: "NEW_IP_FOR_ENTITY", weight: 30 }));
        }

        // New user-agent for existing user
        if (ctx.userAgent) {
          const ua = ctx.userAgent.toLowerCase();
          if (!b.uaSet.has(ua) && b.uaSet.size > 0) {
            signals.push(Object.freeze({ label: "NEW_UA_FOR_ENTITY", weight: 20 }));
          }
        }
      }

      const riskScore = computeRiskScore(signals);
      return Object.freeze({
        anomalyDetected: signals.length > 0,
        riskScore,
        signals: Object.freeze(signals),
      });
    },
  };
}
