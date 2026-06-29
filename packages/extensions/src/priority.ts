// Ordering utilities for prioritized extension handlers.
import type { Prioritized } from "./types.js";

export const Priority = {
  LOWEST: 1000,
  LOW: 750,
  NORMAL: 500,
  HIGH: 250,
  HIGHEST: 0,
} as const;

export type PriorityLevel = (typeof Priority)[keyof typeof Priority];

/** Sort an array of prioritized items ascending (lowest number = runs first). */
export function sortByPriority<T extends Prioritized>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => (a.priority ?? Priority.NORMAL) - (b.priority ?? Priority.NORMAL)
  );
}

/** Insert a prioritized item into an already-sorted array (immutable). */
export function insertSorted<T extends Prioritized>(items: readonly T[], item: T): T[] {
  return sortByPriority([...items, item]);
}

/** Clamp a numeric priority value to [0, 1000]. */
export function clampPriority(value: number): number {
  return Math.max(0, Math.min(1000, Math.round(value)));
}
