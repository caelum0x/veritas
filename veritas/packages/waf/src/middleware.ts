// Express WAF middleware: inspects incoming requests and enforces WAF decisions
import type { Request, Response, NextFunction } from "express";
import { type Logger, noopLogger } from "@veritas/observability";
import { type Rule } from "./rule.js";
import { type RateRule } from "./rate-rule.js";
import { type GeoRule } from "./geo-rule.js";
import { decide, type DecisionContext } from "./decision.js";
import { type WafRequest } from "./types.js";

export interface WafMiddlewareConfig {
  readonly rules?: readonly Rule[];
  readonly rateRules?: readonly RateRule[];
  readonly geoRules?: readonly GeoRule[];
  readonly ipReputationThreshold?: number;
  readonly ipReputationScores?: Readonly<Record<string, number>>;
  readonly geoLookup?: (ip: string) => string;
  readonly logger?: Logger;
  readonly blockStatusCode?: number;
  readonly challengeStatusCode?: number;
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0];
    return first !== undefined ? first.trim() : (req.ip ?? "0.0.0.0");
  }
  return req.ip ?? "0.0.0.0";
}

function extractBody(req: Request): string {
  if (typeof req.body === "string") return req.body;
  if (req.body !== null && req.body !== undefined) {
    try {
      return JSON.stringify(req.body);
    } catch {
      return "";
    }
  }
  return "";
}

function flattenHeaders(req: Request): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      result[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      result[key.toLowerCase()] = value.join(", ");
    }
  }
  return result;
}

export function createWafMiddleware(config: WafMiddlewareConfig = {}) {
  const {
    rules = [],
    rateRules = [],
    geoRules = [],
    ipReputationThreshold,
    ipReputationScores,
    geoLookup = () => "",
    logger = noopLogger,
    blockStatusCode = 403,
    challengeStatusCode = 401,
  } = config;

  const ctx: DecisionContext = {
    rules,
    rateRules,
    geoRules,
    ipReputationThreshold,
    ipReputationScores,
  };

  return function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
    const ip = extractIp(req);
    const geo = geoLookup(ip);

    const wafRequest: WafRequest = {
      ip,
      method: req.method,
      uri: req.path,
      query: req.query ? new URLSearchParams(req.query as Record<string, string>).toString() : "",
      headers: flattenHeaders(req),
      body: extractBody(req),
      geo,
      timestamp: Date.now(),
    };

    const decision = decide(ctx, wafRequest);

    logger.info("WAF decision", {
      ip,
      method: req.method,
      uri: req.path,
      outcome: decision.outcome,
      ruleId: decision.ruleId,
      reason: decision.reason,
      latencyMs: decision.latencyMs,
    });

    switch (decision.outcome) {
      case "block":
        res.status(blockStatusCode).json({
          error: "Forbidden",
          message: "Request blocked by WAF",
          code: "WAF_BLOCKED",
        });
        return;

      case "challenge":
        res.status(challengeStatusCode).json({
          error: "Challenge Required",
          message: "Request requires additional verification",
          code: "WAF_CHALLENGE",
        });
        return;

      case "log":
        logger.warn("WAF logged suspicious request", {
          ip,
          method: req.method,
          uri: req.path,
          reason: decision.reason,
        });
        next();
        return;

      case "allow":
      default:
        next();
        return;
    }
  };
}
