// WAF decision engine: combines rule, rate, geo, and IP-reputation results into a final verdict
import { type Rule, evaluateRule } from "./rule.js";
import { type RateRule, consumeToken } from "./rate-rule.js";
import { type GeoRule, isGeoAllowed } from "./geo-rule.js";
import { type WafRequest, type WafDecision, type DecisionOutcome } from "./types.js";

export interface DecisionContext {
  readonly rules: readonly Rule[];
  readonly rateRules: readonly RateRule[];
  readonly geoRules: readonly GeoRule[];
  readonly ipReputationThreshold?: number;
  readonly ipReputationScores?: Readonly<Record<string, number>>;
}

function buildRequestRecord(req: WafRequest): Readonly<Record<string, unknown>> {
  return {
    ip: req.ip,
    method: req.method,
    uri: req.uri,
    query: req.query,
    headers: req.headers,
    body: req.body,
    geo: req.geo,
  };
}

function resolveOutcome(action: string): DecisionOutcome {
  switch (action) {
    case "allow": return "allow";
    case "block": return "block";
    case "challenge": return "challenge";
    case "log": return "log";
    default: return "block";
  }
}

export function decide(ctx: DecisionContext, req: WafRequest): WafDecision {
  const start = Date.now();
  const requestRecord = buildRequestRecord(req);

  // Evaluate WAF rules in priority order (already sorted by ruleset)
  for (const rule of ctx.rules) {
    if (evaluateRule(rule, requestRecord)) {
      return {
        outcome: resolveOutcome(rule.action),
        ruleId: rule.id,
        reason: `Matched rule: ${rule.name}`,
        latencyMs: Date.now() - start,
        metadata: { ruleId: rule.id, ruleName: rule.name },
      };
    }
  }

  // Evaluate geo rules
  const { allowed: geoAllowed, matchedRule: geoRule } = isGeoAllowed(ctx.geoRules, req.geo);
  if (!geoAllowed && geoRule !== undefined) {
    return {
      outcome: resolveOutcome(geoRule.action),
      ruleId: geoRule.id,
      reason: `Geo block: country ${req.geo}`,
      latencyMs: Date.now() - start,
      metadata: { countryCode: req.geo, geoRuleId: geoRule.id },
    };
  }

  // Evaluate IP reputation
  if (ctx.ipReputationThreshold !== undefined && ctx.ipReputationScores !== undefined) {
    const score = ctx.ipReputationScores[req.ip];
    if (score !== undefined && score < ctx.ipReputationThreshold) {
      return {
        outcome: "block",
        ruleId: undefined,
        reason: `IP reputation score ${score} below threshold ${ctx.ipReputationThreshold}`,
        latencyMs: Date.now() - start,
        metadata: { ip: req.ip, reputationScore: score },
      };
    }
  }

  // Evaluate rate rules
  for (const rateRule of ctx.rateRules) {
    const allowed = consumeToken(rateRule, req.ip);
    if (!allowed) {
      return {
        outcome: resolveOutcome(rateRule.action),
        ruleId: rateRule.id,
        reason: `Rate limit exceeded: ${rateRule.name}`,
        latencyMs: Date.now() - start,
        metadata: { rateRuleId: rateRule.id, ip: req.ip },
      };
    }
  }

  return {
    outcome: "allow",
    ruleId: undefined,
    reason: "No matching rules",
    latencyMs: Date.now() - start,
    metadata: {},
  };
}
