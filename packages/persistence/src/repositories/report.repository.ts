// ReportRepository interface: read/write access to persisted verification reports.

import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Report, CreateReport } from "@veritas/contracts";

/** Filter options for listing reports. */
export interface ReportFilters {
  /** Optionally restrict to reports for a specific verification. */
  readonly verificationId?: string;
}

/** Repository abstraction for Report entities. */
export interface ReportRepository {
  /**
   * Find a report by its id.
   * Returns Err(NotFoundError) if no such report exists.
   */
  findById(id: string): Promise<Result<Report, NotFoundError>>;

  /**
   * Find a report by its verification id.
   * Returns Err(NotFoundError) if no report is linked to that verification.
   */
  findByVerificationId(verificationId: string): Promise<Result<Report, NotFoundError>>;

  /**
   * List reports with optional filters and cursor-based pagination.
   */
  list(filters: ReportFilters, page: PageRequest): Promise<Page<Report>>;

  /**
   * Persist a new report derived from CreateReport data.
   * Returns Err(ConflictError) if a report for the same verificationId already exists.
   */
  create(data: CreateReport): Promise<Result<Report, ConflictError>>;

  /**
   * Replace a stored report's mutable fields.
   * Returns Err(NotFoundError) if the report does not exist.
   */
  update(id: string, data: Partial<CreateReport>): Promise<Result<Report, NotFoundError>>;

  /**
   * Remove a report by id.
   * Returns Err(NotFoundError) if the report does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
