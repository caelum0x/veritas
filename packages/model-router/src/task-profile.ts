// Task profiles: per-TaskKind defaults for model selection heuristics
import type { TaskKind, QualityTier } from "./types.js";

/** Static profile encoding the natural requirements of each task kind */
export interface TaskProfile {
  readonly kind: TaskKind;
  /** Default quality tier when the caller does not specify one */
  readonly defaultQualityTier: QualityTier;
  /** Whether this task kind inherently benefits from web search */
  readonly benefitsFromWebSearch: boolean;
  /** Rough multiplier on token cost sensitivity (higher = more cost-sensitive) */
  readonly costSensitivity: number; // 0-1
  /** Relative quality importance for this task kind (higher = prefer premium) */
  readonly qualityWeight: number; // 0-1
}

/** Known profiles indexed by TaskKind */
const PROFILES: Readonly<Record<TaskKind, TaskProfile>> = {
  "extract-claims": {
    kind: "extract-claims",
    defaultQualityTier: "balanced",
    benefitsFromWebSearch: false,
    costSensitivity: 0.6,
    qualityWeight: 0.5,
  },
  research: {
    kind: "research",
    defaultQualityTier: "balanced",
    benefitsFromWebSearch: true,
    costSensitivity: 0.4,
    qualityWeight: 0.7,
  },
  adjudicate: {
    kind: "adjudicate",
    defaultQualityTier: "premium",
    benefitsFromWebSearch: false,
    costSensitivity: 0.2,
    qualityWeight: 0.9,
  },
  summarize: {
    kind: "summarize",
    defaultQualityTier: "economy",
    benefitsFromWebSearch: false,
    costSensitivity: 0.8,
    qualityWeight: 0.3,
  },
  classify: {
    kind: "classify",
    defaultQualityTier: "economy",
    benefitsFromWebSearch: false,
    costSensitivity: 0.9,
    qualityWeight: 0.2,
  },
  general: {
    kind: "general",
    defaultQualityTier: "balanced",
    benefitsFromWebSearch: false,
    costSensitivity: 0.5,
    qualityWeight: 0.5,
  },
};

/** Return the static profile for a task kind */
export function getTaskProfile(kind: TaskKind): TaskProfile {
  return PROFILES[kind];
}

/** Resolve the effective quality tier, preferring the caller's override */
export function resolveQualityTier(
  kind: TaskKind,
  override?: QualityTier,
): QualityTier {
  return override ?? PROFILES[kind].defaultQualityTier;
}

/** Return true when the task should request web-search capability */
export function requiresWebSearch(
  kind: TaskKind,
  callerFlag?: boolean,
): boolean {
  if (callerFlag !== undefined) return callerFlag;
  return PROFILES[kind].benefitsFromWebSearch;
}
