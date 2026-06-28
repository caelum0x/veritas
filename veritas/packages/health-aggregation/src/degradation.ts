// Evaluates graceful degradation signals from health snapshots using a configurable policy.
import type { HealthSnapshot, HealthStatus, DegradationPolicy, DegradationSignal } from "./types.js";
import type { HealthCheckRegistration } from "./types.js";
import { InvalidDegradationPolicyError } from "./errors.js";

export const DEFAULT_DEGRADATION_POLICY: DegradationPolicy = {
  criticalThreshold: 1.0,
  nonCriticalThreshold: 0.5,
};

/** Validates that thresholds are within [0, 1]. */
export function validateDegradationPolicy(policy: DegradationPolicy): void {
  if (policy.criticalThreshold < 0 || policy.criticalThreshold > 1) {
    throw new InvalidDegradationPolicyError("criticalThreshold", policy.criticalThreshold);
  }
  if (policy.nonCriticalThreshold < 0 || policy.nonCriticalThreshold > 1) {
    throw new InvalidDegradationPolicyError("nonCriticalThreshold", policy.nonCriticalThreshold);
  }
}

/** Derives the aggregate status from a snapshot using the provided policy and registrations. */
export function evaluateDegradation(
  snapshot: HealthSnapshot,
  registrations: readonly HealthCheckRegistration[],
  policy: DegradationPolicy = DEFAULT_DEGRADATION_POLICY,
): HealthStatus {
  validateDegradationPolicy(policy);

  const criticalNames = new Set(
    registrations.filter((r) => r.critical).map((r) => r.name),
  );

  const criticalChecks = snapshot.checks.filter((c) => criticalNames.has(c.name));
  const nonCriticalChecks = snapshot.checks.filter((c) => !criticalNames.has(c.name));

  const healthyFraction = (checks: typeof snapshot.checks): number => {
    if (checks.length === 0) return 1;
    const healthy = checks.filter((c) => c.status === "healthy").length;
    return healthy / checks.length;
  };

  const criticalFrac = healthyFraction(criticalChecks);
  const nonCriticalFrac = healthyFraction(nonCriticalChecks);

  const anyUnhealthyCritical = criticalChecks.some((c) => c.status === "unhealthy");
  if (anyUnhealthyCritical || criticalFrac < policy.criticalThreshold) {
    return "unhealthy";
  }

  const anyCriticalDegraded = criticalChecks.some((c) => c.status === "degraded");
  if (anyCriticalDegraded || nonCriticalFrac < policy.nonCriticalThreshold) {
    return "degraded";
  }

  return "healthy";
}

/** Computes degradation signals by comparing a previous and current snapshot. */
export function computeDegradationSignals(
  previous: HealthSnapshot,
  current: HealthSnapshot,
): readonly DegradationSignal[] {
  const previousByName = new Map(previous.checks.map((c) => [c.name, c.status]));

  return current.checks.flatMap((check): DegradationSignal[] => {
    const prev: HealthStatus = previousByName.get(check.name) ?? "unknown" as HealthStatus;
    if (prev === check.status) return [];
    return [
      {
        componentName: check.name,
        previousStatus: prev,
        currentStatus: check.status,
        triggeredAt: current.timestamp,
        reason: `Status changed from "${prev}" to "${check.status}"`,
      },
    ];
  });
}
