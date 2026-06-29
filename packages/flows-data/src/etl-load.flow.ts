// ETL load flow: extract records from source → transform → load to warehouse.
import { ok, err, isOk, type Result } from "@veritas/core";
import { InMemoryExtractor, BatchLoader } from "@veritas/etl";
import type { TransformedRecord, RawRecord } from "@veritas/etl";
import { EtlLoadFlowError } from "./errors.js";
import { makeEtlLoadCompletedEvent } from "./events.js";
import type { EtlLoadFlowDeps } from "./deps.js";

export interface EtlLoadInput {
  readonly runId: string;
  readonly batchSize?: number;
  readonly limit?: number;
  readonly incrementalCursor?: string | null;
}

export interface EtlLoadOutput {
  readonly runId: string;
  readonly loaded: number;
  readonly failed: number;
  readonly skipped: number;
}

export class EtlLoadFlow {
  constructor(private readonly deps: EtlLoadFlowDeps) {}

  async run(input: EtlLoadInput): Promise<Result<EtlLoadOutput, EtlLoadFlowError>> {
    const { source, transformSteps, sink, warehouse, logger, eventBus } = this.deps;
    const batchSize = input.batchSize ?? 100;

    logger.info("etl-load-flow: starting", { runId: input.runId });

    const extractor = new InMemoryExtractor({ source, batchSize });
    const loader = new BatchLoader(sink, false);

    const allTransformed: TransformedRecord[] = [];
    let extractFailed = false;

    for await (const result of extractor.extract({
      runId: input.runId,
      mode: input.incrementalCursor != null ? "incremental" : "full",
      since: input.incrementalCursor ?? undefined,
      limit: input.limit,
    })) {
      if (!isOk(result)) {
        logger.warn("etl-load-flow: extract error", { error: result.error.message });
        extractFailed = true;
        break;
      }

      const raw: RawRecord = result.value;
      let record: RawRecord = raw;

      for (let stepIndex = 0; stepIndex < transformSteps.length; stepIndex++) {
        const step = transformSteps[stepIndex]!;
        const tResult = step.transform(record as RawRecord, {
          runId: input.runId,
          stepIndex,
        });
        if (!isOk(tResult)) {
          logger.warn("etl-load-flow: transform error", { step: step.name, error: tResult.error.message });
          record = raw; // keep original on transform failure, skip step
          break;
        }
        record = tResult.value;
      }

      allTransformed.push(record as TransformedRecord);
    }

    if (extractFailed && allTransformed.length === 0) {
      return err(new EtlLoadFlowError({ message: "Extract phase produced no records due to errors" }));
    }

    const loadResult = await loader.load(allTransformed, {
      runId: input.runId,
      batchSize,
    });

    if (!isOk(loadResult)) {
      return err(new EtlLoadFlowError({ message: loadResult.error.message, cause: loadResult.error }));
    }

    const { loaded, failed, skipped } = loadResult.value;

    logger.info("etl-load-flow: completed", { runId: input.runId, loaded, failed, skipped });

    await eventBus.publish(makeEtlLoadCompletedEvent({ loaded, failed, skipped }));

    return ok({ runId: input.runId, loaded, failed, skipped });
  }
}
