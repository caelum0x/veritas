// cursor.ts: stream cursor tracking last processed position
import { z } from "zod";
import { IsoTimestamp } from "@veritas/core";

/** Cursor uniquely identifies the last-processed position in a change stream */
export type CdcCursor = Readonly<{
  /** Logical sequence number (e.g. WAL LSN or offset string) */
  lsn: string;
  /** Monotonically increasing sequence within the same lsn */
  sequence: number;
  /** Wall-clock timestamp at cursor creation */
  capturedAt: IsoTimestamp;
  /** Identifier of the stream/consumer this cursor belongs to */
  streamId: string;
}>;

export const CdcCursorSchema = z.object({
  lsn: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  capturedAt: z.string(),
  streamId: z.string().min(1),
});

/** Create a new cursor at the given LSN */
export const makeCursor = (
  streamId: string,
  lsn: string,
  sequence = 0
): CdcCursor => ({
  streamId,
  lsn,
  sequence,
  capturedAt: new Date().toISOString() as IsoTimestamp,
});

/** Advance a cursor to a newer position */
export const advanceCursor = (
  cursor: CdcCursor,
  newLsn: string,
  newSequence?: number
): CdcCursor => ({
  ...cursor,
  lsn: newLsn,
  sequence: newSequence ?? cursor.sequence + 1,
  capturedAt: new Date().toISOString() as IsoTimestamp,
});

/** Compare two cursors; returns negative if a < b, 0 if equal, positive if a > b */
export const compareCursors = (a: CdcCursor, b: CdcCursor): number => {
  if (a.lsn < b.lsn) return -1;
  if (a.lsn > b.lsn) return 1;
  return a.sequence - b.sequence;
};

/** In-memory cursor store interface */
export interface CursorStore {
  load(streamId: string): Promise<CdcCursor | null>;
  save(cursor: CdcCursor): Promise<void>;
}

/** In-memory implementation of CursorStore (suitable for testing) */
export class InMemoryCursorStore implements CursorStore {
  private readonly state = new Map<string, CdcCursor>();

  async load(streamId: string): Promise<CdcCursor | null> {
    return this.state.get(streamId) ?? null;
  }

  async save(cursor: CdcCursor): Promise<void> {
    this.state.set(cursor.streamId, { ...cursor });
  }
}
