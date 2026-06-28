// Incremental checkpoint store — persists pipeline progress cursors for resumable extraction.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { Checkpoint } from "./types.js";
import { CheckpointError } from "./errors.js";

export const SaveCheckpointSchema = z.object({
  pipelineId: z.string().min(1),
  cursor: z.string(),
  recordsProcessed: z.number().int().nonnegative(),
});

export type SaveCheckpoint = z.infer<typeof SaveCheckpointSchema>;

export interface CheckpointRepository {
  save(data: SaveCheckpoint): Promise<Result<Checkpoint, CheckpointError>>;
  load(pipelineId: string): Promise<Result<Checkpoint | null, CheckpointError>>;
  clear(pipelineId: string): Promise<Result<void, CheckpointError>>;
}

export class InMemoryCheckpointRepository implements CheckpointRepository {
  private readonly store = new Map<string, Checkpoint>();

  async save(data: SaveCheckpoint): Promise<Result<Checkpoint, CheckpointError>> {
    const parsed = SaveCheckpointSchema.safeParse(data);
    if (!parsed.success) {
      return err(new CheckpointError({ message: parsed.error.message }));
    }

    const checkpoint: Checkpoint = Object.freeze({
      pipelineId: parsed.data.pipelineId,
      cursor: parsed.data.cursor,
      recordsProcessed: parsed.data.recordsProcessed,
      checkpointedAt: new Date().toISOString(),
    });

    this.store.set(parsed.data.pipelineId, checkpoint);
    return ok(checkpoint);
  }

  async load(pipelineId: string): Promise<Result<Checkpoint | null, CheckpointError>> {
    const checkpoint = this.store.get(pipelineId) ?? null;
    return ok(checkpoint);
  }

  async clear(pipelineId: string): Promise<Result<void, CheckpointError>> {
    this.store.delete(pipelineId);
    return ok(undefined);
  }
}

export function makeCheckpoint(
  pipelineId: string,
  cursor: string,
  recordsProcessed: number,
): Checkpoint {
  return Object.freeze({
    pipelineId,
    cursor,
    recordsProcessed,
    checkpointedAt: new Date().toISOString(),
  });
}
