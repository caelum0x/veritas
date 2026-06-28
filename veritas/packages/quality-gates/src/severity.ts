// Severity levels for quality gate findings, ordered from lowest to highest.

export const SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Numeric rank so severities can be compared with > / <. */
export const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

/** Returns true when `a` is at least as severe as `b`. */
export function atLeast(a: Severity, b: Severity): boolean {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b];
}

/** Returns the more severe of two severities. */
export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** Returns true when the severity is blocking (error or critical). */
export function isBlocking(severity: Severity): boolean {
  return atLeast(severity, "error");
}
