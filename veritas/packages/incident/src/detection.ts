// Auto-detect incidents from incoming alerts using threshold and pattern rules.
import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type SeverityLevel, SeverityLevelSchema } from "./severity.js";

export const AlertSourceSchema = z.enum(["metrics", "logs", "synthetic", "external", "manual"]);
export type AlertSource = z.infer<typeof AlertSourceSchema>;

export const IncomingAlertSchema = z.object({
  id: z.string(),
  source: AlertSourceSchema,
  serviceName: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  severity: SeverityLevelSchema,
  fingerprint: z.string().min(1),
  labels: z.record(z.string(), z.string()),
  receivedAt: z.string(),
});
export type IncomingAlert = z.infer<typeof IncomingAlertSchema>;

export const DetectionRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  matchSeverities: z.array(SeverityLevelSchema),
  matchSources: z.array(AlertSourceSchema),
  labelFilters: z.record(z.string(), z.string()),
  autoCreateIncident: z.boolean(),
  assignedSeverityOverride: SeverityLevelSchema.nullable(),
});
export type DetectionRule = z.infer<typeof DetectionRuleSchema>;

export interface DetectionResult {
  readonly shouldCreate: boolean;
  readonly incidentTitle: string;
  readonly severity: SeverityLevel;
  readonly matchedRuleId: string | null;
  readonly alert: IncomingAlert;
}

function labelsMatch(
  ruleFilters: Readonly<Record<string, string>>,
  alertLabels: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(ruleFilters).every(([k, v]) => alertLabels[k] === v);
}

export function evaluateAlert(
  alert: IncomingAlert,
  rules: readonly DetectionRule[],
): Result<DetectionResult> {
  const parsed = IncomingAlertSchema.safeParse(alert);
  if (!parsed.success) {
    return err(new Error(`Invalid alert: ${parsed.error.message}`));
  }
  const validAlert = parsed.data;

  for (const rule of rules) {
    const severityMatch =
      rule.matchSeverities.length === 0 || rule.matchSeverities.includes(validAlert.severity);
    const sourceMatch =
      rule.matchSources.length === 0 || rule.matchSources.includes(validAlert.source);
    const labelMatch = labelsMatch(rule.labelFilters, validAlert.labels);

    if (severityMatch && sourceMatch && labelMatch) {
      return ok({
        shouldCreate: rule.autoCreateIncident,
        incidentTitle: validAlert.title,
        severity: rule.assignedSeverityOverride ?? validAlert.severity,
        matchedRuleId: rule.id,
        alert: validAlert,
      });
    }
  }

  return ok({
    shouldCreate: false,
    incidentTitle: validAlert.title,
    severity: validAlert.severity,
    matchedRuleId: null,
    alert: validAlert,
  });
}

export function deduplicateAlert(
  alert: IncomingAlert,
  existingFingerprints: ReadonlySet<string>,
): boolean {
  return existingFingerprints.has(alert.fingerprint);
}

export function buildDefaultRules(): readonly DetectionRule[] {
  return [
    {
      id: "default-sev1",
      name: "Auto-create SEV1 incidents",
      matchSeverities: ["SEV1"],
      matchSources: [],
      labelFilters: {},
      autoCreateIncident: true,
      assignedSeverityOverride: null,
    },
    {
      id: "default-sev2",
      name: "Auto-create SEV2 incidents",
      matchSeverities: ["SEV2"],
      matchSources: [],
      labelFilters: {},
      autoCreateIncident: true,
      assignedSeverityOverride: null,
    },
  ];
}
