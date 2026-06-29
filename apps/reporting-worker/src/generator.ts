// Generates a report from a template + parameters, persists it, and logs delivery intent.
import { isOk, ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ReportStore, ReportTemplateStore } from "@veritas/reporting";
import type { Logger } from "@veritas/observability";
import type { ReportJob } from "./queue.js";

export interface GeneratorDeps {
  readonly reportStore: ReportStore;
  readonly templateStore: ReportTemplateStore;
  readonly logger: Logger;
}

export interface GenerateResult {
  readonly reportId: string;
  readonly recipientCount: number;
}

/** Generate a report record from the given job and mark it ready. */
export async function generateAndDeliver(
  job: ReportJob,
  deps: GeneratorDeps,
): Promise<Result<GenerateResult>> {
  const { reportStore, templateStore, logger } = deps;

  // 1. Load the template to get title/description defaults
  const tplResult = await templateStore.get(job.templateId);
  if (!isOk(tplResult)) {
    logger.warn("Template not found for job", { templateId: job.templateId, jobId: job.id });
    return err(tplResult.error);
  }
  const template = tplResult.value;

  // 2. Create a draft report record
  const dateLabel = new Date().toISOString().slice(0, 10);
  const createResult = await reportStore.create({
    title: `${template.name} — ${dateLabel}`,
    description: template.description,
    format: job.format as "json" | "html" | "pdf" | "csv" | "markdown",
    templateId: job.templateId,
    ownerId: job.ownerId,
    organizationId: job.organizationId,
    parameters: job.parameters,
  });
  if (!isOk(createResult)) {
    logger.error("Failed to create report record", { jobId: job.id });
    return err(createResult.error);
  }

  const draft = createResult.value;

  // 3. Mark as generating
  const genResult = await reportStore.update(draft.id, { status: "generating" });
  if (!isOk(genResult)) {
    return err(genResult.error);
  }

  // 4. Mark as ready (rendering is handled by the reporting package renderer)
  const readyResult = await reportStore.update(draft.id, {
    status: "ready",
    generatedAt: new Date().toISOString(),
  });
  if (!isOk(readyResult)) {
    // Mark as failed if we cannot transition to ready
    await reportStore.update(draft.id, {
      status: "failed",
      failureReason: "Failed to finalize report status",
    });
    return err(readyResult.error);
  }

  logger.info("Report generated", {
    reportId: draft.id,
    organizationId: job.organizationId,
    recipientCount: job.recipientIds.length,
  });

  return ok({ reportId: draft.id, recipientCount: job.recipientIds.length });
}
