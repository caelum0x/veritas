// Detection rules registry — defines and evaluates named threat rules.

import type { ThreatContext } from "./types.js";

export interface Rule {
  readonly id: string;
  readonly description: string;
  readonly weight: number; // contribution to risk score (0-100)
  evaluate(ctx: ThreatContext): boolean;
}

const KNOWN_MALICIOUS_UAS = [
  "sqlmap",
  "nikto",
  "masscan",
  "zgrab",
  "python-requests/2.0",
  "go-http-client/1.1",
];

const SCRAPER_PATTERNS = [
  "scrapy",
  "wget",
  "curl/",
  "libwww-perl",
  "httpclient",
];

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^127\./,
];

export const defaultRules: readonly Rule[] = Object.freeze([
  {
    id: "SUSPICIOUS_USER_AGENT",
    description: "User-agent matches known attack or scraper tools",
    weight: 40,
    evaluate(ctx: ThreatContext): boolean {
      if (!ctx.userAgent) return false;
      const ua = ctx.userAgent.toLowerCase();
      return [...KNOWN_MALICIOUS_UAS, ...SCRAPER_PATTERNS].some((p) =>
        ua.includes(p)
      );
    },
  },
  {
    id: "MISSING_USER_AGENT",
    description: "Request has no user-agent header",
    weight: 20,
    evaluate(ctx: ThreatContext): boolean {
      return !ctx.userAgent || ctx.userAgent.trim().length === 0;
    },
  },
  {
    id: "PRIVATE_IP_ORIGIN",
    description: "Request originates from a private/loopback IP range",
    weight: 10,
    evaluate(ctx: ThreatContext): boolean {
      if (!ctx.ip) return false;
      return PRIVATE_IP_RANGES.some((re) => re.test(ctx.ip as string));
    },
  },
  {
    id: "NO_SESSION",
    description: "Authenticated action attempted without a session",
    weight: 30,
    evaluate(ctx: ThreatContext): boolean {
      return !ctx.sessionId && ctx.userId !== undefined;
    },
  },
  {
    id: "STALE_TIMESTAMP",
    description: "Request timestamp is more than 5 minutes from server time",
    weight: 35,
    evaluate(ctx: ThreatContext): boolean {
      const drift = Math.abs(Date.now() - ctx.timestamp);
      return drift > 5 * 60 * 1000;
    },
  },
  {
    id: "MISSING_RESOURCE",
    description: "Action targets no identifiable resource",
    weight: 15,
    evaluate(ctx: ThreatContext): boolean {
      return ctx.action !== undefined && !ctx.resourceId;
    },
  },
]);

export function evaluateRules(
  ctx: ThreatContext,
  rules: readonly Rule[] = defaultRules
): ReadonlyArray<{ readonly label: string; readonly weight: number }> {
  return rules
    .filter((r) => r.evaluate(ctx))
    .map((r) => Object.freeze({ label: r.id, weight: r.weight }));
}

export function registerRule(
  registry: Rule[],
  rule: Rule
): readonly Rule[] {
  const filtered = registry.filter((r) => r.id !== rule.id);
  return Object.freeze([...filtered, rule]);
}
