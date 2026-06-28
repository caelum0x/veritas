// Drill-down and drill-up navigation along dimension hierarchies.
import { ok, err, type Result } from "@veritas/core";
import type { CubeDimension } from "./dimension.js";
import { levelIndex } from "./dimension.js";
import { InvalidDrillError } from "./errors.js";

/** Represents the current drill state on a single dimension. */
export interface DrillState {
  /** Name of the dimension being navigated. */
  readonly dimensionName: string;
  /** Name of the current hierarchy level. */
  readonly currentLevel: string;
  /** Pinned member values at ancestor levels (level name → member value). */
  readonly context: Readonly<Record<string, string | number | null>>;
}

/** Result of a drill navigation — new state after moving up or down. */
export interface DrillResult {
  readonly state: DrillState;
  /** Level we moved from. */
  readonly previousLevel: string;
  /** Level we moved to. */
  readonly nextLevel: string;
}

/** Drill down to the next finer level, pinning the selected member at the current level. */
export function drillDown(
  dim: CubeDimension,
  state: DrillState,
  selectedMember: string | number | null
): Result<DrillResult> {
  const currentIdx = levelIndex(dim, state.currentLevel);
  if (currentIdx === -1) {
    return err(new InvalidDrillError(`Level "${state.currentLevel}" not found in dimension "${dim.name}"`));
  }
  if (currentIdx >= dim.hierarchy.length - 1) {
    return err(new InvalidDrillError(`Already at the finest level "${state.currentLevel}" in dimension "${dim.name}"`));
  }

  const nextLevel = dim.hierarchy[currentIdx + 1]!;
  const newContext: Record<string, string | number | null> = {
    ...state.context,
    [state.currentLevel]: selectedMember,
  };

  const newState: DrillState = {
    dimensionName: dim.name,
    currentLevel: nextLevel.name,
    context: newContext,
  };

  return ok({
    state: newState,
    previousLevel: state.currentLevel,
    nextLevel: nextLevel.name,
  });
}

/** Drill up to the next coarser level, removing context at or below the target. */
export function drillUp(
  dim: CubeDimension,
  state: DrillState
): Result<DrillResult> {
  const currentIdx = levelIndex(dim, state.currentLevel);
  if (currentIdx === -1) {
    return err(new InvalidDrillError(`Level "${state.currentLevel}" not found in dimension "${dim.name}"`));
  }
  if (currentIdx === 0) {
    return err(new InvalidDrillError(`Already at the coarsest level "${state.currentLevel}" in dimension "${dim.name}"`));
  }

  const prevLevel = dim.hierarchy[currentIdx - 1]!;

  // Remove context entries at levels >= currentIdx (fine-grained context no longer applies)
  const levelsToRemove = new Set(
    dim.hierarchy.slice(currentIdx - 1).map((l) => l.name)
  );
  const newContext: Record<string, string | number | null> = Object.fromEntries(
    Object.entries(state.context).filter(([k]) => !levelsToRemove.has(k))
  );

  const newState: DrillState = {
    dimensionName: dim.name,
    currentLevel: prevLevel.name,
    context: newContext,
  };

  return ok({
    state: newState,
    previousLevel: state.currentLevel,
    nextLevel: prevLevel.name,
  });
}

/** Create an initial DrillState at the coarsest hierarchy level. */
export function initialDrillState(dim: CubeDimension): Result<DrillState> {
  if (dim.hierarchy.length === 0) {
    return err(new InvalidDrillError(`Dimension "${dim.name}" has no hierarchy levels`));
  }
  return ok({
    dimensionName: dim.name,
    currentLevel: dim.hierarchy[0]!.name,
    context: {},
  });
}

/** Return all ancestor level names of the current level (coarser → finer, excluding current). */
export function ancestorLevels(dim: CubeDimension, state: DrillState): readonly string[] {
  const idx = levelIndex(dim, state.currentLevel);
  if (idx <= 0) return [];
  return dim.hierarchy.slice(0, idx).map((l) => l.name);
}

/** Return all descendant level names of the current level (finer, excluding current). */
export function descendantLevels(dim: CubeDimension, state: DrillState): readonly string[] {
  const idx = levelIndex(dim, state.currentLevel);
  if (idx === -1 || idx >= dim.hierarchy.length - 1) return [];
  return dim.hierarchy.slice(idx + 1).map((l) => l.name);
}
