// Pipeline runner — orchestrates extract → transform → load with checkpointing and retry.
import { ok, err, isOk, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type {
  RawRecord,
  TransformedRecord,
  PipelineRun,
  PipelineRunResult,
  Extractor,
  TransformStep,
  Loader,
  ExtractContext,
  TransformContext,
  LoadContext,
  RunMode,
  EtlStatus,
} from "./types.js";
import type { CheckpointRepository } from "./checkpoint.js";
import { PipelineError } from "./errors.js";

export interface PipelineDefinition {
  readonly id: string;
  readonly name: string;
  readonly extractor: Extractor;
  readonly steps: ReadonlyArray<TransformStep>;
  readonly loader: Loader;
  readonly batchSize?: number;
}

export interface RunOptions {
  readonly mode?: RunMode;
  readonly since?: string;
  readonly limit?: number;
  readonly checkpointRepo?: CheckpointRepository;
}

async function applySteps(
  record: RawRecord,
  steps: ReadonlyArray<TransformStep>,
  ctx: TransformContext,
): Promise<Result<TransformedRecord>> {
  let current: RawRecord = record;
  let transformed: TransformedRecord | null = null;

  for (let i = 0; i < steps.length; i++) {
    const stepCtx: TransformContext = { ...ctx, stepIndex: i };
    const step = steps[i];
    if (step === undefined) break;
    const result = step.transform(current, stepCtx);
    if (!isOk(result)) return result;
    transformed = result.value;
    // Use the transformed record's fields for next step if chaining
    current = { id: transformed.id, fields: transformed.fields, meta: transformed.meta };
  }

  if (transformed === null) {
    // No steps — wrap raw record as transformed
    const now = new Date().toISOString();
    return ok(
      Object.freeze({
        id: record.id,
        fields: record.fields,
        meta: record.meta,
        sourceId: record.meta["sourceId"] as string ?? "unknown",
        extractedAt: now,
        transformedAt: now,
      }),
    );
  }

  return ok(transformed);
}

export async function runPipeline(
  pipeline: PipelineDefinition,
  options: RunOptions = {},
): Promise<PipelineRunResult> {
  const runId = newId("run");
  const mode: RunMode = options.mode ?? "full";
  const batchSize = pipeline.batchSize ?? 100;
  const startedAt = new Date().toISOString();

  // Load checkpoint cursor if incremental
  let since = options.since;
  if (mode === "incremental" && options.checkpointRepo) {
    const cpResult = await options.checkpointRepo.load(pipeline.id);
    if (isOk(cpResult) && cpResult.value !== null) {
      since = since ?? cpResult.value.cursor;
    }
  }

  const extractCtx: ExtractContext = { runId, mode, since, limit: options.limit };

  let recordsExtracted = 0;
  let recordsLoaded = 0;
  let recordsFailed = 0;
  let lastCursor: string | undefined;
  const batch: TransformedRecord[] = [];

  const flushBatch = async (): Promise<Result<void>> => {
    if (batch.length === 0) return ok(undefined);
    const loadCtx: LoadContext = { runId, batchSize };
    const loadResult = await pipeline.loader.load([...batch], loadCtx);
    batch.length = 0;
    if (!isOk(loadResult)) return loadResult;
    recordsLoaded += loadResult.value.loaded;
    recordsFailed += loadResult.value.failed;
    return ok(undefined);
  };

  try {
    for await (const extractResult of pipeline.extractor.extract(extractCtx)) {
      if (!isOk(extractResult)) {
        const finishedAt = new Date().toISOString();
        return err(
          new PipelineError(pipeline.id, {
            message: `Extraction failed: ${extractResult.error.message}`,
            cause: extractResult.error,
          }),
        );
      }

      const raw = extractResult.value;
      recordsExtracted += 1;
      lastCursor = raw.id;

      const transformCtx: TransformContext = { runId, stepIndex: 0 };
      const transformResult = await applySteps(raw, pipeline.steps, transformCtx);

      if (!isOk(transformResult)) {
        recordsFailed += 1;
        continue;
      }

      batch.push(transformResult.value);

      if (batch.length >= batchSize) {
        const flushResult = await flushBatch();
        if (!isOk(flushResult)) {
          const finishedAt = new Date().toISOString();
          return err(
            new PipelineError(pipeline.id, {
              message: `Load failed: ${flushResult.error instanceof Error ? flushResult.error.message : String(flushResult.error)}`,
              cause: flushResult.error,
            }),
          );
        }

        // Save checkpoint after each flush
        if (options.checkpointRepo && lastCursor !== undefined) {
          await options.checkpointRepo.save({
            pipelineId: pipeline.id,
            cursor: lastCursor,
            recordsProcessed: recordsExtracted,
          });
        }
      }
    }

    // Flush remainder
    const finalFlush = await flushBatch();
    if (!isOk(finalFlush)) {
      const finishedAt = new Date().toISOString();
      return err(
        new PipelineError(pipeline.id, {
          message: `Final load failed: ${finalFlush.error instanceof Error ? finalFlush.error.message : String(finalFlush.error)}`,
        }),
      );
    }

    // Final checkpoint
    if (options.checkpointRepo && lastCursor !== undefined) {
      await options.checkpointRepo.save({
        pipelineId: pipeline.id,
        cursor: lastCursor,
        recordsProcessed: recordsExtracted,
      });
    }

    const finishedAt = new Date().toISOString();
    const status: EtlStatus = recordsFailed === 0 ? "success" : "skipped";

    const run: PipelineRun = Object.freeze({
      id: runId,
      pipelineId: pipeline.id,
      status,
      startedAt,
      finishedAt,
      recordsExtracted,
      recordsLoaded,
      recordsFailed,
      error: null,
    });

    return ok(run);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const finishedAt = new Date().toISOString();
    return err(
      new PipelineError(pipeline.id, {
        message: `Unexpected pipeline error: ${message}`,
        cause: e instanceof Error ? e : undefined,
      }),
    );
  }
}
