// @veritas/context-window — re-exports the full public surface.
export type { Role, Turn, ContextWindow, PackResult } from "./types.js";
export {
  type Budget,
  type BudgetTracker,
  makeBudget,
  createBudgetTracker,
  wouldExceed,
} from "./budget.js";
export {
  type TokenCounter,
  charApproxCounter,
  wordApproxCounter,
  withFramingOverhead,
} from "./counter.js";
export {
  BudgetExceededError,
  CounterUnavailableError,
  CompactionError,
} from "./errors.js";
export {
  type PriorityWeights,
  DEFAULT_WEIGHTS,
  scoreTurn,
  sortByPriority,
} from "./priority.js";
export { type PackOptions, packTurns } from "./packer.js";
export {
  type CompactionStrategy,
  concatenationCompactor,
  compactTurns,
} from "./compactor.js";
export { type PruneOptions, pruneTurns } from "./pruner.js";
export {
  type WindowOptions,
  type SlidingWindow,
  createSlidingWindow,
} from "./window.js";
