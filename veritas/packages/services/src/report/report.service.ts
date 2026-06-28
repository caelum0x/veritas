// Report application service: retrieve and manage persisted verification reports.
import {
  ok,
  err,
  isErr,
  type Result,
  type AppError,
  type Logger,
  type Page,
  toPageRequest,
} from "@veritas/core";
import type { ReportRepository } from "@veritas/persistence";
import type { Report } from "@veritas/contracts";
import type { ServiceContext } from "../service-context.js";
import { ResourceNotFoundError } from "../errors.js";
import type {
  GetReportByIdInput,
  GetReportByVerificationIdInput,
  ListReportsInput,
  DeleteReportInput,
  ReportView,
} from "./report.dto.js";
import { ListReportsInputSchema } from "./report.dto.js";
import { PreconditionFailedError } from "../errors.js";

/** Dependencies injected into ReportService. */
export interface ReportServiceDeps {
  readonly reportRepository: ReportRepository;
  readonly logger: Logger;
}

/** Maps a persisted Report entity to a ReportView projection. */
function toReportView(report: Report): ReportView {
  return {
    id: report.id,
    verificationId: report.verificationId,
    contentHash: report.contentHash,
    summary: report.summary,
    trustScore: report.trustScore,
    counts: {
      supported: report.counts.supported,
      refuted: report.counts.refuted,
      unverifiable: report.counts.unverifiable,
    },
    claims: report.claims.map((c) => ({
      claim: c.claim,
      verdict: c.verdict,
      confidence: c.confidence,
      reasoning: c.reasoning,
      citationIds: [...c.citationIds],
    })),
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

/** Application service for querying and managing verification reports. */
export class ReportService {
  private readonly reports: ReportRepository;
  private readonly logger: Logger;

  constructor(deps: ReportServiceDeps) {
    this.reports = deps.reportRepository;
    this.logger = deps.logger;
  }

  /** Fetch a single report by its ID. */
  async getById(
    ctx: ServiceContext,
    input: GetReportByIdInput,
  ): Promise<Result<ReportView, AppError>> {
    const result = await this.reports.findById(input.reportId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Report", input.reportId) as AppError);
    }
    this.logger.debug("report: fetched by id", {
      reportId: input.reportId,
      traceId: ctx.traceId,
    });
    return ok(toReportView(result.value));
  }

  /** Fetch the report associated with a specific verification run. */
  async getByVerificationId(
    ctx: ServiceContext,
    input: GetReportByVerificationIdInput,
  ): Promise<Result<ReportView, AppError>> {
    const result = await this.reports.findByVerificationId(input.verificationId);
    if (isErr(result)) {
      return err(
        new ResourceNotFoundError("Report", input.verificationId) as AppError,
      );
    }
    this.logger.debug("report: fetched by verificationId", {
      verificationId: input.verificationId,
      traceId: ctx.traceId,
    });
    return ok(toReportView(result.value));
  }

  /** List reports with optional verification filter and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListReportsInput,
  ): Promise<Result<Page<ReportView>, AppError>> {
    const parsed = ListReportsInputSchema.safeParse(input);
    if (!parsed.success) {
      return err(
        new PreconditionFailedError(
          parsed.error.issues.map((i) => i.message).join("; "),
        ) as AppError,
      );
    }

    const { verificationId, cursor, limit } = parsed.data;
    const pageRequest = toPageRequest({ cursor, limit });

    const page = await this.reports.list(
      { verificationId },
      pageRequest,
    );

    this.logger.debug("report: listed", {
      count: page.items.length,
      traceId: ctx.traceId,
    });

    return ok({
      ...page,
      items: page.items.map(toReportView),
    });
  }

  /** Delete a report by ID. */
  async delete(
    ctx: ServiceContext,
    input: DeleteReportInput,
  ): Promise<Result<void, AppError>> {
    const findResult = await this.reports.findById(input.reportId);
    if (isErr(findResult)) {
      return err(new ResourceNotFoundError("Report", input.reportId) as AppError);
    }

    const deleteResult = await this.reports.delete(input.reportId);
    if (isErr(deleteResult)) {
      return err(new ResourceNotFoundError("Report", input.reportId) as AppError);
    }

    this.logger.info("report: deleted", {
      reportId: input.reportId,
      traceId: ctx.traceId,
    });
    return ok(undefined);
  }
}
