// In-memory implementation of PlanRepository using MemoryStore.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Page, PageRequest } from "@veritas/core";
import type { Plan, CreatePlan, UpdatePlan } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import type { PlanRepository, PlanFilters } from "../repositories/plan.repository.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import { toPlanRow, fromPlanRow, mergePlanRow, type PlanRow } from "../mappers/plan.mapper.js";

/** In-memory PlanRepository: suitable for testing and development. */
export class MemoryPlanRepository implements PlanRepository {
  private readonly store = new MemoryStore<PlanRow & { id: string }>();

  async findById(id: string): Promise<Result<Plan, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Plan", id));
    }
    return ok(fromPlanRow(row));
  }

  async findByName(name: string): Promise<Result<Plan, NotFoundError>> {
    const row = this.store.all().find((r) => r.name === name);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Plan", `name:${name}`));
    }
    return ok(fromPlanRow(row));
  }

  async list(filters: PlanFilters, page: PageRequest): Promise<Page<Plan>> {
    let rows = this.store.all();

    if (filters.billingInterval !== undefined) {
      rows = rows.filter((r) => r.interval === filters.billingInterval);
    }
    if (filters.isActive !== undefined) {
      rows = rows.filter((r) => r.active === filters.isActive);
    }
    if (filters.priceCurrency !== undefined) {
      rows = rows.filter((r) => r.priceCurrency === filters.priceCurrency);
    }

    rows = rows.sort((a, b) => a.createdAt - b.createdAt);

    const plans = rows.map(fromPlanRow);
    return paginateArray(plans, page);
  }

  async create(data: CreatePlan): Promise<Result<Plan, ConflictError>> {
    const existing = this.store.all().find((r) => r.name === data.name);
    if (existing !== undefined) {
      return err(new RepositoryConflictError("Plan", `name already exists: ${data.name}`));
    }

    const row = toPlanRow(data);
    this.store.set(row);
    return ok(fromPlanRow(row));
  }

  async update(id: string, data: UpdatePlan): Promise<Result<Plan, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Plan", id));
    }

    const updated = mergePlanRow(existing, data);
    this.store.set(updated);
    return ok(fromPlanRow(updated));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Plan", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
