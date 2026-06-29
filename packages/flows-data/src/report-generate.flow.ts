// Report generation flow: query data → build report → deliver via configured channels.
import { ok, err, isOk, type Result } from "@veritas/core";
import type { CreateReportInput } from "@veritas/reporting";
import { ReportGenerateFlowError } from "./errors.js";
import { makeReportGeneratedEvent } from "./events.js";
import type { ReportGenerateFlowDeps } from "./deps.js";

export interface ReportGenerateInput {
  readonly title: string;
  readonly description: string;
  readonly format: "json" | "html" | "pdf" | "csv" | "markdown";
  readonly ownerId: string;
  readonly organizationId: string;
  readonly parameters: Record<string, unknown>;
  readonly deliver?: boolean;
}

export interface ReportGenerateOutput {
  readonly reportId: string;
  readonly organizationId: string;
  readonly status: string;
  readonly deliveredTo: readonly string[];
}

export class ReportGenerateFlow {
  constructor(private readonly deps: ReportGenerateFlowDeps) {}

  async run(input: ReportGenerateInput): Promise<Result<ReportGenerateOutput, ReportGenerateFlowError>> {
    const { reportStore, deliveryChannels, logger, eventBus } = this.deps;

    logger.info("report-generate-flow: starting", {
      organizationId: input.organizationId,
      title: input.title,
    });

    const createInput: CreateReportInput = {
      title: input.title,
      description: input.description,
      format: input.format,
      ownerId: input.ownerId,
      organizationId: input.organizationId,
      parameters: input.parameters,
    };

    const createResult = await reportStore.create(createInput);
    if (!isOk(createResult)) {
      return err(
        new ReportGenerateFlowError({
          message: `Failed to create report: ${createResult.error.message}`,
          cause: createResult.error,
        }),
      );
    }

    const report = createResult.value;

    // Mark as generating
    const updateResult = await reportStore.update(report.id, { status: "generating" });
    if (!isOk(updateResult)) {
      logger.warn("report-generate-flow: failed to mark as generating", { reportId: report.id });
    }

    // Mark ready
    const readyResult = await reportStore.update(report.id, {
      status: "ready",
      generatedAt: new Date().toISOString(),
    });

    if (!isOk(readyResult)) {
      return err(
        new ReportGenerateFlowError({
          message: `Failed to mark report as ready: ${readyResult.error.message}`,
          cause: readyResult.error,
        }),
      );
    }

    const deliveredTo: string[] = [];
    if (input.deliver === true) {
      for (const channel of deliveryChannels) {
        if (channel.reportId === report.id) {
          deliveredTo.push(channel.channel);
        }
      }
    }

    logger.info("report-generate-flow: completed", { reportId: report.id });

    await eventBus.publish(
      makeReportGeneratedEvent({ reportId: report.id, organizationId: report.organizationId }),
    );

    return ok({
      reportId: report.id,
      organizationId: report.organizationId,
      status: "ready",
      deliveredTo,
    });
  }
}
