// Security event definitions emitted when threats are detected.

import type { RiskLevel, ThreatContext } from "./types.js";

export type SecurityEventKind =
  | "THREAT_DETECTED"
  | "ANOMALY_DETECTED"
  | "ABUSE_DETECTED"
  | "FRAUD_SIGNAL"
  | "VELOCITY_BREACH"
  | "BLOCKLIST_HIT"
  | "RESPONSE_TRIGGERED";

export interface SecurityEvent {
  readonly id: string;
  readonly kind: SecurityEventKind;
  readonly riskLevel: RiskLevel;
  readonly context: ThreatContext;
  readonly reasons: readonly string[];
  readonly signals: readonly string[];
  readonly occurredAt: number;
}

export function makeSecurityEvent(
  id: string,
  kind: SecurityEventKind,
  riskLevel: RiskLevel,
  context: ThreatContext,
  reasons: readonly string[],
  signals: readonly string[] = []
): SecurityEvent {
  return Object.freeze({
    id,
    kind,
    riskLevel,
    context,
    reasons,
    signals,
    occurredAt: Date.now(),
  });
}

export function isHighSeverity(event: SecurityEvent): boolean {
  return event.riskLevel === "high" || event.riskLevel === "critical";
}

export function serializeEvent(event: SecurityEvent): Record<string, unknown> {
  return {
    id: event.id,
    kind: event.kind,
    riskLevel: event.riskLevel,
    userId: event.context.userId,
    ip: event.context.ip,
    sessionId: event.context.sessionId,
    action: event.context.action,
    resourceId: event.context.resourceId,
    reasons: [...event.reasons],
    signals: [...event.signals],
    occurredAt: event.occurredAt,
  };
}
