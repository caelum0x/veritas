// Abuse detection — identifies API abuse patterns such as scraping and credential stuffing.

import type { ThreatContext } from "./types.js";
import { computeRiskScore } from "./score.js";
import type { RiskScore } from "./types.js";

export interface AbuseSignal {
  readonly label: string;
  readonly weight: number;
}

export interface AbuseResult {
  readonly abuseDetected: boolean;
  readonly riskScore: RiskScore;
  readonly signals: readonly AbuseSignal[];
}

const SCRAPER_UA_FRAGMENTS = [
  "scrapy",
  "python-requests",
  "wget",
  "curl/",
  "libwww-perl",
  "go-http-client",
  "java/",
  "okhttp",
  "axios/",
];

const ATTACK_UA_FRAGMENTS = [
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "dirbuster",
  "hydra",
];

interface FailureTracker {
  readonly counts: Map<string, number>;
}

const AUTH_FAILURE_THRESHOLD = 5;

export interface AbuseDetector {
  detect(ctx: ThreatContext): AbuseResult;
  recordAuthFailure(entityKey: string): void;
  resetAuthFailures(entityKey: string): void;
}

export function createAbuseDetector(): AbuseDetector {
  const tracker: FailureTracker = { counts: new Map() };

  function authFailureKey(ctx: ThreatContext): string {
    return ctx.userId ?? ctx.ip ?? "unknown";
  }

  return {
    recordAuthFailure(entityKey: string): void {
      const current = tracker.counts.get(entityKey) ?? 0;
      tracker.counts.set(entityKey, current + 1);
    },

    resetAuthFailures(entityKey: string): void {
      tracker.counts.delete(entityKey);
    },

    detect(ctx: ThreatContext): AbuseResult {
      const signals: AbuseSignal[] = [];
      const ua = ctx.userAgent?.toLowerCase() ?? "";

      // Known attack tool
      if (ATTACK_UA_FRAGMENTS.some((f) => ua.includes(f))) {
        signals.push(Object.freeze({ label: "ATTACK_TOOL_UA", weight: 90 }));
      }

      // Known scraper
      if (SCRAPER_UA_FRAGMENTS.some((f) => ua.includes(f))) {
        signals.push(Object.freeze({ label: "SCRAPER_UA", weight: 45 }));
      }

      // Credential stuffing: repeated auth failures
      const failKey = authFailureKey(ctx);
      const failCount = tracker.counts.get(failKey) ?? 0;
      if (failCount >= AUTH_FAILURE_THRESHOLD) {
        const weight = Math.min(100, 40 + (failCount - AUTH_FAILURE_THRESHOLD) * 5);
        signals.push(Object.freeze({ label: "REPEATED_AUTH_FAILURES", weight }));
      }

      // No user-agent header
      if (!ctx.userAgent || ctx.userAgent.trim().length === 0) {
        signals.push(Object.freeze({ label: "MISSING_UA", weight: 20 }));
      }

      const riskScore = computeRiskScore(signals);
      return Object.freeze({
        abuseDetected: signals.length > 0 && riskScore.value >= 20,
        riskScore,
        signals: Object.freeze(signals),
      });
    },
  };
}
