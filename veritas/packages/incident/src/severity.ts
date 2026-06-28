// Incident severity levels with priority ordering and display metadata.
import { z } from "zod";

export const SeverityLevelSchema = z.enum(["SEV1", "SEV2", "SEV3", "SEV4", "SEV5"]);
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export interface SeverityMeta {
  readonly level: SeverityLevel;
  readonly priority: number; // 1 = highest
  readonly label: string;
  readonly description: string;
  readonly responseTimeMinutes: number;
  readonly requiresOnCall: boolean;
}

const SEVERITY_MAP: Readonly<Record<SeverityLevel, SeverityMeta>> = {
  SEV1: {
    level: "SEV1",
    priority: 1,
    label: "Critical",
    description: "Complete service outage or data loss affecting all users",
    responseTimeMinutes: 5,
    requiresOnCall: true,
  },
  SEV2: {
    level: "SEV2",
    priority: 2,
    label: "High",
    description: "Major feature unavailable or significant performance degradation",
    responseTimeMinutes: 15,
    requiresOnCall: true,
  },
  SEV3: {
    level: "SEV3",
    priority: 3,
    label: "Medium",
    description: "Minor feature unavailable with a workaround available",
    responseTimeMinutes: 60,
    requiresOnCall: false,
  },
  SEV4: {
    level: "SEV4",
    priority: 4,
    label: "Low",
    description: "Cosmetic issue or minor inconvenience with no user impact",
    responseTimeMinutes: 240,
    requiresOnCall: false,
  },
  SEV5: {
    level: "SEV5",
    priority: 5,
    label: "Informational",
    description: "Monitoring alert or informational notification requiring no immediate action",
    responseTimeMinutes: 1440,
    requiresOnCall: false,
  },
};

export function getSeverityMeta(level: SeverityLevel): SeverityMeta {
  return SEVERITY_MAP[level];
}

export function compareSeverity(a: SeverityLevel, b: SeverityLevel): number {
  return SEVERITY_MAP[a].priority - SEVERITY_MAP[b].priority;
}

export function isHigherSeverity(a: SeverityLevel, b: SeverityLevel): boolean {
  return SEVERITY_MAP[a].priority < SEVERITY_MAP[b].priority;
}

export function requiresOnCall(level: SeverityLevel): boolean {
  return SEVERITY_MAP[level].requiresOnCall;
}

export const ALL_SEVERITIES: readonly SeverityLevel[] = ["SEV1", "SEV2", "SEV3", "SEV4", "SEV5"];
