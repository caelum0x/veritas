// Export application service: manage async data-export jobs for organizations.
import { isOk, newId } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  PreconditionFailedError,
  InsufficientPermissionsError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  RequestExportInput,
  GetExportInput,
  ListExportsInput,
  CancelExportInput,
  DownloadExportInput,
  ExportJobOutput,
  ListExportsOutput,
  DownloadExportOutput,
  ExportStatus,
  ExportFormat,
  ExportResourceType,
} from "./export.dto.js";

/** Number of seconds a signed download URL remains valid. */
const DOWNLOAD_URL_TTL_SECONDS = 3600;

/** Maximum number of concurrent active export jobs per organization. */
const MAX_CONCURRENT_EXPORTS = 5;

/** Persisted export job record shape (superset of ExportJobOutput). */
interface ExportRecord {
  readonly exportId: string;
  readonly resourceType: ExportResourceType;
  readonly format: ExportFormat;
  readonly status: ExportStatus;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly downloadUrl: string | null;
  readonly expiresAt: string | null;
  readonly rowCount: number | null;
  readonly fileSizeBytes: number | null;
  readonly errorMessage: string | null;
  readonly organizationId: string;
  readonly requestedBy: string;
  readonly filters: {
    from?: string;
    to?: string;
    ids?: string[];
  } | null;
  readonly includeFields: string[] | null;
  readonly excludeFields: string[] | null;
}

/** List options for export repository queries. */
interface ExportListOptions {
  readonly resourceType?: ExportResourceType;
  readonly status?: ExportStatus;
  readonly limit: number;
  readonly cursor?: string;
}

/** Paginated result returned by the export repository. */
interface ExportPage {
  readonly items: ExportRecord[];
  readonly nextCursor?: string;
  readonly total: number;
}

/** Minimal repository interface for export jobs (defined locally). */
export interface ExportRepository {
  countActiveByOrg(orgId: string): Promise<Result<number, AppError>>;
  create(data: ExportRecord): Promise<Result<ExportRecord, AppError>>;
  findById(id: string): Promise<Result<ExportRecord, AppError>>;
  listByOrg(orgId: string, opts: ExportListOptions): Promise<ExportPage>;
  update(
    id: string,
    patch: Partial<ExportRecord>,
  ): Promise<Result<ExportRecord, AppError>>;
  refreshDownloadUrl(
    id: string,
    expiresAt: string,
  ): Promise<Result<ExportRecord, AppError>>;
}

/** Dependencies required by ExportService. */
export interface ExportServiceDeps extends BaseServiceDeps {
  readonly exportRepo: ExportRepository;
}

/** Application service for managing data-export jobs. */
export class ExportService extends BaseService {
  private readonly exportRepo: ExportRepository;

  constructor(deps: ExportServiceDeps) {
    super(deps);
    this.exportRepo = deps.exportRepo;
  }

  /**
   * Enqueue a new export job for the requesting organization.
   * Returns immediately with a pending job record; processing is async.
   */
  async requestExport(
    ctx: ServiceContext,
    input: RequestExportInput,
  ): Promise<Result<ExportJobOutput, AppError>> {
    this.log(ctx, "info", "export.request", {
      resourceType: input.resourceType,
      format: input.format,
    });
    return serviceCall(async () => {
      const orgId = ctx.principal.orgId ?? ctx.principal.userId;

      // Enforce concurrent-export cap per organization.
      const activeResult = await this.exportRepo.countActiveByOrg(String(orgId));
      const activeCount: number = isOk(activeResult) ? activeResult.value : 0;
      if (activeCount >= MAX_CONCURRENT_EXPORTS) {
        throw new PreconditionFailedError(
          `Organization has reached the maximum of ${MAX_CONCURRENT_EXPORTS} concurrent export jobs.`,
        );
      }

      const exportId = String(newId("export"));
      const requestedAt = this.now();
      const job: ExportJobOutput = {
        exportId,
        resourceType: input.resourceType,
        format: input.format ?? "json",
        status: "pending",
        requestedAt,
        completedAt: null,
        downloadUrl: null,
        expiresAt: null,
        rowCount: null,
        fileSizeBytes: null,
        errorMessage: null,
      };

      const createResult = await this.exportRepo.create({
        ...job,
        organizationId: String(orgId),
        requestedBy: String(ctx.principal.userId),
        filters: input.filters ?? null,
        includeFields: input.includeFields ?? null,
        excludeFields: input.excludeFields ?? null,
      });
      if (!isOk(createResult)) throw createResult.error;

      this.log(ctx, "info", "export.queued", { exportId });
      return job;
    });
  }

  /** Retrieve a single export job by its ID. */
  async getExport(
    ctx: ServiceContext,
    input: GetExportInput,
  ): Promise<Result<ExportJobOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.exportRepo.findById(input.exportId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Export", input.exportId);
      }
      const record: ExportRecord = result.value;
      this.assertAccess(ctx, record.organizationId, "view export");
      return this.toOutput(record);
    });
  }

  /** List export jobs visible to the requesting principal. */
  async listExports(
    ctx: ServiceContext,
    input: ListExportsInput,
  ): Promise<Result<ListExportsOutput, AppError>> {
    this.log(ctx, "debug", "export.list", { status: input.status });
    return serviceCall(async () => {
      const orgId = String(ctx.principal.orgId ?? ctx.principal.userId);
      const page = await this.exportRepo.listByOrg(orgId, {
        resourceType: input.resourceType,
        status: input.status,
        limit: input.limit ?? 20,
        cursor: input.cursor,
      });
      return {
        items: page.items.map((j: ExportRecord) => this.toOutput(j)),
        nextCursor: page.nextCursor ?? null,
        total: page.total,
      };
    });
  }

  /**
   * Cancel a pending or processing export job.
   * Completed or already-failed jobs cannot be cancelled.
   */
  async cancelExport(
    ctx: ServiceContext,
    input: CancelExportInput,
  ): Promise<Result<ExportJobOutput, AppError>> {
    this.log(ctx, "info", "export.cancel", { exportId: input.exportId });
    return serviceCall(async () => {
      const result = await this.exportRepo.findById(input.exportId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Export", input.exportId);
      }
      const job: ExportRecord = result.value;
      this.assertAccess(ctx, job.organizationId, "cancel export");

      const terminal: ExportStatus[] = ["completed", "failed"];
      if (terminal.includes(job.status)) {
        throw new PreconditionFailedError(
          `Cannot cancel an export in '${job.status}' status.`,
        );
      }

      const updated = await this.exportRepo.update(input.exportId, {
        status: "failed",
        errorMessage: "Cancelled by user.",
        completedAt: this.now(),
      });
      if (!isOk(updated)) throw updated.error;
      return this.toOutput(updated.value);
    });
  }

  /**
   * Generate (or refresh) a signed download URL for a completed export.
   * Throws if the export is not yet completed.
   */
  async getDownloadUrl(
    ctx: ServiceContext,
    input: DownloadExportInput,
  ): Promise<Result<DownloadExportOutput, AppError>> {
    this.log(ctx, "debug", "export.download", { exportId: input.exportId });
    return serviceCall(async () => {
      const result = await this.exportRepo.findById(input.exportId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Export", input.exportId);
      }
      const job: ExportRecord = result.value;
      this.assertAccess(ctx, job.organizationId, "download export");

      if (job.status !== "completed") {
        throw new PreconditionFailedError(
          `Export is not ready for download (current status: '${job.status}').`,
        );
      }
      if (!job.downloadUrl) {
        throw new PreconditionFailedError("Download URL is not available.");
      }

      const expiresAt = new Date(
        this.clock.now() + DOWNLOAD_URL_TTL_SECONDS * 1000,
      ).toISOString();

      // Refresh the URL expiry in the repository.
      const refreshResult = await this.exportRepo.refreshDownloadUrl(
        input.exportId,
        expiresAt,
      );
      const freshUrl: string | null = isOk(refreshResult)
        ? refreshResult.value.downloadUrl
        : job.downloadUrl;

      return {
        downloadUrl: freshUrl ?? job.downloadUrl,
        expiresAt,
        fileSizeBytes: job.fileSizeBytes ?? 0,
        format: job.format,
      };
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toOutput(record: ExportRecord): ExportJobOutput {
    return {
      exportId: record.exportId,
      resourceType: record.resourceType,
      format: record.format,
      status: record.status,
      requestedAt: record.requestedAt,
      completedAt: record.completedAt,
      downloadUrl: record.downloadUrl,
      expiresAt: record.expiresAt,
      rowCount: record.rowCount,
      fileSizeBytes: record.fileSizeBytes,
      errorMessage: record.errorMessage,
    };
  }

  private assertAccess(
    ctx: ServiceContext,
    ownerOrgId: string,
    action: string,
  ): void {
    const callerOrg = String(ctx.principal.orgId ?? ctx.principal.userId);
    const isAdmin =
      ctx.principal.roles.includes("admin") ||
      ctx.principal.roles.includes("system");
    if (!isAdmin && callerOrg !== ownerOrgId) {
      throw new InsufficientPermissionsError(action);
    }
  }
}

