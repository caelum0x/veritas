// Automated response actions triggered when threat thresholds are breached.

import type { RiskLevel } from "./types.js";
import type { SecurityEvent } from "./event.js";
import type { Blocklist } from "./blocklist.js";

export type ResponseAction =
  | "LOG"
  | "ALERT"
  | "THROTTLE"
  | "BLOCK"
  | "TERMINATE_SESSION";

export interface ResponsePolicy {
  readonly minRiskLevel: RiskLevel;
  readonly actions: readonly ResponseAction[];
}

export interface ResponseOutcome {
  readonly eventId: string;
  readonly actionsApplied: readonly ResponseAction[];
  readonly handledAt: number;
}

const LEVEL_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const defaultPolicies: readonly ResponsePolicy[] = Object.freeze([
  { minRiskLevel: "low", actions: ["LOG"] },
  { minRiskLevel: "medium", actions: ["LOG", "ALERT"] },
  { minRiskLevel: "high", actions: ["LOG", "ALERT", "THROTTLE"] },
  { minRiskLevel: "critical", actions: ["LOG", "ALERT", "BLOCK", "TERMINATE_SESSION"] },
]);

export function resolveActions(
  event: SecurityEvent,
  policies: readonly ResponsePolicy[] = defaultPolicies
): readonly ResponseAction[] {
  const eventLevel = LEVEL_ORDER[event.riskLevel];
  const matched = policies
    .filter((p) => LEVEL_ORDER[p.minRiskLevel] <= eventLevel)
    .flatMap((p) => [...p.actions]);
  return Object.freeze([...new Set(matched)]);
}

export interface ResponseHandler {
  handle(event: SecurityEvent, actions: readonly ResponseAction[]): Promise<ResponseOutcome>;
}

export function createLoggingResponseHandler(
  log: (msg: string, data: Record<string, unknown>) => void
): ResponseHandler {
  return {
    async handle(event: SecurityEvent, actions: readonly ResponseAction[]): Promise<ResponseOutcome> {
      log("threat-response", {
        eventId: event.id,
        kind: event.kind,
        riskLevel: event.riskLevel,
        actions,
        reasons: event.reasons,
      });
      return Object.freeze({ eventId: event.id, actionsApplied: actions, handledAt: Date.now() });
    },
  };
}

export interface BlockingResponseOptions {
  readonly blocklist: Blocklist;
  readonly blockTtlMs?: number;
  readonly log: (msg: string, data: Record<string, unknown>) => void;
}

export function createBlockingResponseHandler(opts: BlockingResponseOptions): ResponseHandler {
  const { blocklist, blockTtlMs, log } = opts;
  return {
    async handle(event: SecurityEvent, actions: readonly ResponseAction[]): Promise<ResponseOutcome> {
      const applied: ResponseAction[] = [];
      for (const action of actions) {
        switch (action) {
          case "LOG":
            log("threat-response:log", {
              eventId: event.id,
              riskLevel: event.riskLevel,
              reasons: event.reasons,
            });
            applied.push("LOG");
            break;
          case "ALERT":
            log("threat-response:alert", {
              eventId: event.id,
              riskLevel: event.riskLevel,
              userId: event.context.userId,
              ip: event.context.ip,
            });
            applied.push("ALERT");
            break;
          case "BLOCK": {
            const ip = event.context.ip;
            if (ip) {
              blocklist.add({
                kind: "ip",
                value: ip,
                reason: event.reasons[0] ?? "threat-detected",
                addedAt: Date.now(),
                expiresAt: blockTtlMs !== undefined ? Date.now() + blockTtlMs : undefined,
              });
            }
            const userId = event.context.userId;
            if (userId) {
              blocklist.add({
                kind: "userId",
                value: userId,
                reason: event.reasons[0] ?? "threat-detected",
                addedAt: Date.now(),
                expiresAt: blockTtlMs !== undefined ? Date.now() + blockTtlMs : undefined,
              });
            }
            applied.push("BLOCK");
            break;
          }
          case "THROTTLE":
            log("threat-response:throttle", { eventId: event.id, ip: event.context.ip });
            applied.push("THROTTLE");
            break;
          case "TERMINATE_SESSION":
            log("threat-response:terminate-session", {
              eventId: event.id,
              sessionId: event.context.sessionId,
            });
            applied.push("TERMINATE_SESSION");
            break;
        }
      }
      return Object.freeze({ eventId: event.id, actionsApplied: Object.freeze(applied), handledAt: Date.now() });
    },
  };
}
