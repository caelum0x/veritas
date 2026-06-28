// In-memory implementation of ReportRepository backed by MemoryStore.

import {
  ok,
  err,
  newId,
  epochToIso,
  makePage,
  encodeCursor,
  decodeCursor,
  toPageRequest,
  isOk,
} from "@veritas/core";
import type { Page, PageRequest, Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Report, CreateReport } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import type { ReportRepository, ReportFilters } from "../repositories/report.repository.js";

export class ReportMemoryRepository implements ReportRepository {
  private readonly store = new MemoryStore<Report>();

  async findById(id: string): Promise<Result<Report, NotFoundError>> {
    const item = this.store.get(id);
    if (item === undefined) {
      return err(new RepositoryNotFoundError("Report", id));
    }
    return ok(item);
  }

  async findByVerificationId(
    verificationId: string,
  ): Promise<Result<Report, NotFoundError>> {
    const match = this.store.all().find((r) => r.verificationId === verificationId);
    if (match === undefined) {
      return err(new RepositoryNotFoundError("Report", verificationId));
    }
    return ok(match);
  }

  async list(filters: ReportFilters, page: PageRequest): Promise<Page<Report>> {
    const req = toPageRequest(page);
    let items = this.store.all();

    if (filters.verificationId !== undefined) {
      items = items.filter((r) => r.verificationId === filters.verificationId);
    }

    // Sort by createdAt descending for deterministic ordering.
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (req.cursor !== undefined) {
      const cursorResult = decodeCursor(req.cursor);
      if (isOk(cursorResult)) {
        const afterId = String(cursorResult.value["id"] ?? "");
        const idx = items.findIndex((r) => r.id === afterId);
        if (idx !== -1) {
          items = items.slice(idx + 1);
        }
      }
    }

    const pageItems = items.slice(0, req.limit);
    const hasMore = items.length > req.limit;
    const nextCursor =
      hasMore && pageItems.length > 0
        ? encodeCursor({ id: pageItems[pageItems.length - 1]!.id })
        : null;

    return makePage(pageItems, nextCursor);
  }

  async create(data: CreateReport): Promise<Result<Report, ConflictError>> {
    const existing = this.store
      .all()
      .find((r) => r.verificationId === data.verificationId);

    if (existing !== undefined) {
      return err(
        new RepositoryConflictError(
          "Report",
          `verification ${data.verificationId} already has a report`,
        ),
      );
    }

    const now = epochToIso(Date.now());
    const report: Report = {
      ...data,
      id: newId("rpt") as Report["id"],
      createdAt: now,
      updatedAt: now,
    };

    const stored = this.store.set(report);
    return ok(stored);
  }

  async update(
    id: string,
    data: Partial<CreateReport>,
  ): Promise<Result<Report, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Report", id));
    }

    const updated: Report = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: epochToIso(Date.now()),
    };

    const stored = this.store.set(updated);
    return ok(stored);
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Report", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
