// Main threat detector — orchestrates anomaly, abuse, fraud, velocity, and rule checks.

import { newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { ThreatContext, DetectionResult } from "./types.js";
import { createAnomalyDetector } from "./anomaly.js";
import type { AnomalyDetector } from "./anomaly.js";
import { createAbuseDetector } from "./abuse.js";
import type { AbuseDetector } from "./abuse.js";
import { detectFraudSignals } from "./fraud-signal.js";
import { createVelocityChecker } from "./velocity.js";
import type { VelocityChecker } from "./velocity.js";
import { evaluateRules } from "./rules.js";
import type { Rule } from "./rules.js";
import { computeRiskScore, mergeScores } from "./score.js";
import { makeSecurityEvent } from "./event.js";
import type { SecurityEvent } from "./event.js";
import { resolveActions } from "./response.js";
import type { ResponseHandler } from "./response.js";
import { createBlocklist } from "./blocklist.js";
import type { Blocklist } from "./blocklist.js";
import { ThreatDetectionError } from "./errors.js";

export interface ThreatDetectorOptions {
  readonly anomalyDetector?: AnomalyDetector;
  readonly abuseDetector?: AbuseDetector;
  readonly velocityChecker?: VelocityChecker;
  readonly blocklist?: Blocklist;
  readonly rules?: readonly Rule[];
  readonly responseHandler?: ResponseHandler;
  readonly threatThreshold?: number; // 0-100, default 30
}

export interface ThreatDetector {
  evaluate(ctx: ThreatContext): Result<DetectionResult, ThreatDetectionError>;
  getBlocklist(): Blocklist;
}

export function createThreatDetector(opts: ThreatDetectorOptions = {}): ThreatDetector {
  const anomaly = opts.anomalyDetector ?? createAnomalyDetector();
  const abuse = opts.abuseDetector ?? createAbuseDetector();
  const velocity = opts.velocityChecker ?? createVelocityChecker();
  const blocklist = opts.blocklist ?? createBlocklist();
  const threshold = opts.threatThreshold ?? 30;

  return {
    getBlocklist(): Blocklist {
      return blocklist;
    },

    evaluate(ctx: ThreatContext): Result<DetectionResult, ThreatDetectionError> {
      try {
        // Blocklist checks first — fast-path rejection
        const reasons: string[] = [];
        const recommended: string[] = [];

        if (ctx.ip && blocklist.isBlocked("ip", ctx.ip)) {
          reasons.push(`IP ${ctx.ip} is blocklisted`);
          recommended.push("BLOCK");
        }
        if (ctx.userId && blocklist.isBlocked("userId", ctx.userId)) {
          reasons.push(`User ${ctx.userId} is blocklisted`);
          recommended.push("TERMINATE_SESSION");
        }
        if (ctx.userAgent && blocklist.isBlocked("userAgent", ctx.userAgent)) {
          reasons.push(`User-agent is blocklisted`);
          recommended.push("BLOCK");
        }

        // Record and check velocity
        velocity.record(ctx);
        const velResult = velocity.check(ctx);
        if (velResult.breached) {
          reasons.push(...velResult.breachedWindows.map((w) => `Velocity breach: ${w}`));
          recommended.push("THROTTLE");
        }

        // Run rule-based checks
        const ruleSignals = evaluateRules(ctx, opts.rules);
        reasons.push(...ruleSignals.map((s) => s.label));

        // Anomaly detection (observe then detect)
        anomaly.observe(ctx);
        const anomalyResult = anomaly.detect(ctx);
        if (anomalyResult.anomalyDetected) {
          reasons.push(...anomalyResult.signals.map((s) => s.label));
        }

        // Abuse detection
        const abuseResult = abuse.detect(ctx);
        if (abuseResult.abuseDetected) {
          reasons.push(...abuseResult.signals.map((s) => s.label));
        }

        // Fraud signal detection
        const fraudResult = detectFraudSignals(ctx);
        if (fraudResult.fraudDetected) {
          reasons.push(...fraudResult.indicators.map((i) => i.label));
        }

        // Aggregate scores
        const ruleScore = computeRiskScore(ruleSignals);
        const combinedScore = mergeScores([
          ruleScore,
          anomalyResult.riskScore,
          abuseResult.riskScore,
          fraudResult.riskScore,
          ...(velResult.breached ? [computeRiskScore(velResult.signals)] : []),
        ]);

        const blocklistBoost = reasons.some((r) => r.includes("blocklisted")) ? 100 : 0;
        const finalValue = Math.min(100, combinedScore.value + blocklistBoost);
        const finalScore = {
          ...combinedScore,
          value: finalValue,
        };

        const threatDetected = finalValue >= threshold;

        if (threatDetected && opts.responseHandler) {
          const event: SecurityEvent = makeSecurityEvent(
            newId("evt"),
            "THREAT_DETECTED",
            finalScore.level,
            ctx,
            reasons,
            finalScore.signals
          );
          const actions = resolveActions(event);
          recommended.push(...actions);
          opts.responseHandler.handle(event, actions);
        }

        const result: DetectionResult = Object.freeze({
          threatDetected,
          riskScore: Object.freeze(finalScore),
          reasons: Object.freeze([...new Set(reasons)]),
          recommended: Object.freeze([...new Set(recommended)]),
        });

        return ok(result);
      } catch (e: unknown) {
        return err(new ThreatDetectionError("Threat evaluation failed", e));
      }
    },
  };
}
