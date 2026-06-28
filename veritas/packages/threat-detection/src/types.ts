// Shared domain types for threat-detection module.

import type { UserId } from "@veritas/core";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ThreatContext {
  readonly userId?: UserId;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly resourceId?: string;
  readonly action?: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

export interface RiskScore {
  readonly value: number; // 0-100
  readonly level: RiskLevel;
  readonly signals: readonly string[];
}

export interface DetectionResult {
  readonly threatDetected: boolean;
  readonly riskScore: RiskScore;
  readonly reasons: readonly string[];
  readonly recommended: readonly string[];
}

export interface ThreatSignal {
  readonly label: string;
  readonly weight: number;
}
