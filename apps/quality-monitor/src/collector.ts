// Collect gate results from pipeline runs and persist snapshots for trend analysis.

import { ok, type Result } from "@veritas/core";
import type { GateResult, PipelineOutcome } from "@veritas/quality-gates";

export interface GateSnapshot {
  readonly gateId: string;
  readonly passed: boolean;
  readonly metric: number | undefined;
  readonly findingCount: number;
  readonly capturedAt: string;
}

export interface CollectorState {
  readonly snapshots: ReadonlyMap<string, readonly GateSnapshot[]>;
}

export interface Collector {
  collect(outcome: PipelineOutcome, asOf?: string): Result<readonly GateSnapshot[]>;
  snapshotsFor(gateId: string): readonly GateSnapshot[];
  allSnapshots(): ReadonlyMap<string, readonly GateSnapshot[]>;
  reset(): void;
}

function toSnapshot(result: GateResult, capturedAt: string): GateSnapshot {
  return {
    gateId: result.gateId,
    passed: result.passed,
    metric: result.metric,
    findingCount: result.findings.length,
    capturedAt,
  };
}

export function createCollector(maxPerGate: number = 50): Collector {
  const store = new Map<string, GateSnapshot[]>();

  return {
    collect(outcome, asOf) {
      const now = asOf ?? new Date().toISOString();
      const created: GateSnapshot[] = [];

      for (const result of outcome.results) {
        const snap = toSnapshot(result, now);
        const existing = store.get(result.gateId) ?? [];
        const updated = existing.length >= maxPerGate
          ? [...existing.slice(1), snap]
          : [...existing, snap];
        store.set(result.gateId, updated);
        created.push(snap);
      }

      return ok(created);
    },

    snapshotsFor(gateId) {
      return store.get(gateId) ?? [];
    },

    allSnapshots() {
      return store as ReadonlyMap<string, readonly GateSnapshot[]>;
    },

    reset() {
      store.clear();
    },
  };
}
