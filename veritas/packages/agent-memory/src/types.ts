// Shared supporting types for the agent-memory package — namespace aggregate.

import type { Memory, MemoryKind } from "./memory.js";

/** Decay configuration for time-based memory forgetting. */
export interface DecayConfig {
  readonly halfLifeDays: number;
  readonly minDecayFactor: number;
  readonly purgeThreshold: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  halfLifeDays: 30,
  minDecayFactor: 0.05,
  purgeThreshold: 0.02,
};

/** A scored memory match returned by retrieval operations. */
export interface MemoryMatch {
  readonly memory: Memory;
  readonly score: number;
}

/** Namespace type aggregating internal type references for consumers. */
export interface AgentMemoryTypes {
  Memory: Memory;
  MemoryKind: MemoryKind;
  DecayConfig: DecayConfig;
  MemoryMatch: MemoryMatch;
}
