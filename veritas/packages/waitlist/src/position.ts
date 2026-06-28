// Queue position computation accounting for boost points
import type { WaitlistEntry } from "./types.js";

/**
 * Computes the effective sort key for an entry: lower is better.
 * boost reduces effective position; entries with more boost rank higher.
 */
export function effectiveSortKey(entry: Pick<WaitlistEntry, "position" | "boostPoints">): number {
  return entry.position - entry.boostPoints;
}

/**
 * Returns entries sorted by effective queue position (ascending).
 */
export function sortedEntries(
  entries: readonly WaitlistEntry[],
): readonly WaitlistEntry[] {
  return [...entries].sort((a, b) => effectiveSortKey(a) - effectiveSortKey(b));
}

/**
 * Assigns a new sequential position for a new entrant.
 * Position is based on the number of existing entries + 1 + a base offset.
 */
export function computePosition(
  existingEntries: readonly WaitlistEntry[],
  baseOffset: number,
): number {
  return existingEntries.length + 1 + baseOffset;
}

/**
 * Returns the 1-based display rank of an entry in the sorted queue.
 */
export function getDisplayRank(
  allEntries: readonly WaitlistEntry[],
  entryId: string,
): number {
  const sorted = sortedEntries(allEntries);
  const idx = sorted.findIndex((e) => e.id === entryId);
  return idx === -1 ? -1 : idx + 1;
}
