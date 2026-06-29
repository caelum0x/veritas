// ETL pipeline — orchestrates extract → transform → load with run tracking and error propagation.
import { ok, err, isOk, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import { PipelineError } from "./errors.js";
import type {
  Extractor,
  TransformStep,
  Loader,
  ExtractContext,
  TransformContext,
  LoadContext,
  PipelineConfig,
  PipelineRun,
  PipelineRunResult,
  EtlStatus,
  RunMode,
  RawRecord,
  TransformedRecord,
} from "./types.js";

export interface PipelineDefinition {
  readonly config: PipelineConfig;
  readonly extractor: Extractor;
  readonly transformSteps: ReadonlyArray<TransformStep>;
  readonly loader: Loader;
}

export interface RunOptions {
  readonly mode?: RunMode;
  readonly since?: string;
  readonly limit?: number;
  readonly batchSize?: number;
}

export class Pipeline {
  private readonly definition: PipelineDefinition;

  constructor(definition: PipelineDefinition) {
    this.definition = definition;
  }

  get id(): string {
    return this.definition.config.id;
  }

  get name(): string {
    return this.definition.config.name;
  }

  async run(options: RunOptions = {}): Promise<PipelineRunResult> {
    const runId = newId("run");
    const startedAt = new Date().toISOString();
    const mode: RunMode = options.mode ?? "full";
    const batchSize = options.batchSize ?? this.definition.config.batchSize ?? 100;

    const extractCtx: ExtractContext = {
      runId,
      mode,
      since: options.since,
      limit: options.limit,
    };

    const rawRecords: RawRecord[] = [];
    for await (const recordResult of this.definition.extractor.extract(extractCtx)) {
      if (!isOk(recordResult)) {
        return err(
          new PipelineError(this.id, {
            message: `Extract failed: ${recordResult.error.message}`,
            cause: recordResult.error,
          }),
        );
      }
      rawRecords.push(recordResult.value);
    }

    const transformed: TransformedRecord[] = [];
    for (let i = 0; i < rawRecords.length; i++) {
      const transformCtx: TransformContext = { runId, stepIndex: i };
      let current: RawRecord = rawRecords[i] as RawRecord;
      for (const step of this.definition.transformSteps) {
        const stepResult = step.transform(current, transformCtx);
        if (!isOk(stepResult)) {
          return err(
            new PipelineError(this.id, {
              message: `Transform step "${step.name}" failed on record ${current.id}: ${stepResult.error.message}`,
              cause: stepResult.error,
            }),
          );
        }
        current = stepResult.value;
      }
      transformed.push(current as TransformedRecord);
    }

    const loadCtx: LoadContext = { runId, batchSize };
    const loadResult = await this.definition.loader.load(transformed, loadCtx);

    if (!isOk(loadResult)) {
      return err(
        new PipelineError(this.id, {
          message: `Load failed: ${loadResult.error.message}`,
          cause: loadResult.error,
        }),
      );
    }

    const finishedAt = new Date().toISOString();
    const { loaded, failed, skipped } = loadResult.value;
    const status: EtlStatus = failed > 0 ? "failed" : "success";

    const run: PipelineRun = Object.freeze({
      id: runId,
      pipelineId: this.id,
      status,
      startedAt,
      finishedAt,
      recordsExtracted: rawRecords.length,
      recordsLoaded: loaded,
      recordsFailed: failed,
      error: null,
    });

    return ok(run);
  }
}

export function createPipeline(definition: PipelineDefinition): Pipeline {
  return new Pipeline(definition);
}
