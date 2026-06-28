// Reports service: wraps @veritas/reporting stores and flows-data flows for report lifecycle.
import { isOk, err, ok, InMemoryEventBus, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import {
  type ReportStore,
  type ReportTemplateStore,
  type Report,
  type ReportPage,
  type ReportTemplate,
  type CreateReportInput,
  type ReportListFilters,
} from "@veritas/reporting";
import { ReportGenerateFlow } from "@veritas/flows-data";
import { VerificationAnalyticsFlow } from "@veritas/flows-data";
import type { AnalyticsStore } from "@veritas/analytics";
import type { Logger } from "@veritas/observability";
import type { GenerateReportBody, AnalyticsQueryBody } from "./reports.schema.js";

export interface ReportsServiceDeps {
  readonly reportStore: ReportStore;
  readonly templateStore: ReportTemplateStore;
  readonly analyticsStore: AnalyticsStore;
  readonly logger: Logger;
}

export class ReportsService {
  readonly #reportStore: ReportStore;
  readonly #templateStore: ReportTemplateStore;
  readonly #analyticsStore: AnalyticsStore;
  readonly #logger: Logger;

  constructor(deps: ReportsServiceDeps) {
    this.#reportStore = deps.reportStore;
    this.#templateStore = deps.templateStore;
    this.#analyticsStore = deps.analyticsStore;
    this.#logger = deps.logger;
  }

  async listReports(filters: ReportListFilters): Promise<Result<ReportPage, AppError>> {
    return this.#reportStore.list(filters);
  }

  async getReport(id: string): Promise<Result<Report, AppError>> {
    return this.#reportStore.get(id as Report["id"]);
  }

  async createReport(input: CreateReportInput): Promise<Result<Report, AppError>> {
    return this.#reportStore.create(input);
  }

  async updateReport(
    id: string,
    patch: Partial<Omit<Report, "id" | "createdAt">>,
  ): Promise<Result<Report, AppError>> {
    return this.#reportStore.update(id as Report["id"], patch);
  }

  async deleteReport(id: string): Promise<Result<void, AppError>> {
    return this.#reportStore.remove(id as Report["id"]);
  }

  async listTemplates(organizationId: string): Promise<Result<readonly ReportTemplate[], AppError>> {
    return this.#templateStore.list(organizationId);
  }

  async generateReport(
    body: GenerateReportBody,
  ): Promise<Result<{ reportId: string; status: string; deliveredTo: readonly string[] }, AppError>> {
    const eventBus = new InMemoryEventBus();
    const flow = new ReportGenerateFlow({
      reportStore: this.#reportStore,
      deliveryChannels: [],
      logger: this.#logger,
      eventBus,
    });

    const result = await flow.run({
      title: body.title,
      description: body.description,
      format: body.format,
      ownerId: body.ownerId,
      organizationId: body.organizationId,
      parameters: body.parameters,
      deliver: body.deliver,
    });

    if (!isOk(result)) {
      return err({ code: "INTERNAL_ERROR", message: result.error.message } as unknown as AppError);
    }

    return ok(result.value);
  }

  async queryAnalytics(
    body: AnalyticsQueryBody,
  ): Promise<Result<{ reportId: string; eventCount: number; organizationId: string }, AppError>> {
    const eventBus = new InMemoryEventBus();
    const flow = new VerificationAnalyticsFlow({
      reportStore: this.#reportStore,
      analyticsStore: this.#analyticsStore,
      logger: this.#logger,
      eventBus,
    });

    const result = await flow.run({
      organizationId: body.organizationId,
      from: body.from,
      to: body.to,
      granularity: body.granularity,
    });

    if (!isOk(result)) {
      return err({ code: "INTERNAL_ERROR", message: result.error.message } as unknown as AppError);
    }

    return ok(result.value);
  }
}
