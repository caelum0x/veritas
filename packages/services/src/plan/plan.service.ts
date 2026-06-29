// Plan application service: use-cases for managing billing plan definitions.
import { ok, err, isOk } from "@veritas/core";
import type { Result, AppError, Page } from "@veritas/core";
import type { Plan } from "@veritas/contracts";
import type { PlanRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  DuplicateResourceError,
  InsufficientPermissionsError,
  PreconditionFailedError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import type {
  CreatePlanInput,
  UpdatePlanInput,
  GetPlanInput,
  GetPlanBySlugInput,
  ListPlansInput,
  PlanOutput,
} from "./plan.dto.js";

/** Dependencies required by PlanService. */
export interface PlanServiceDeps extends BaseServiceDeps {
  readonly planRepo: PlanRepository;
}

function toOutput(plan: Plan): PlanOutput {
  return { ...plan };
}

function assertAdmin(ctx: ServiceContext, action: string): void {
  if (
    !ctx.principal.roles.includes("admin") &&
    !ctx.principal.roles.includes("system")
  ) {
    throw new InsufficientPermissionsError(action);
  }
}

/** Application service for managing billing plan definitions. */
export class PlanService extends BaseService {
  private readonly planRepo: PlanRepository;

  constructor(deps: PlanServiceDeps) {
    super(deps);
    this.planRepo = deps.planRepo;
  }

  /** Create a new billing plan. Requires admin role. */
  async create(
    ctx: ServiceContext,
    input: CreatePlanInput,
  ): Promise<Result<PlanOutput, AppError>> {
    this.log(ctx, "info", "plan.create", { slug: input.slug, name: input.name });
    return serviceCall(async () => {
      assertAdmin(ctx, "create plan");
      const existing = await this.planRepo.findByName(input.name);
      if (isOk(existing)) {
        throw new DuplicateResourceError("Plan", "name", input.name);
      }
      const result = await this.planRepo.create(input);
      if (!isOk(result)) throw result.error;
      return toOutput(result.value);
    });
  }

  /** Retrieve a single plan by its opaque ID. */
  async getById(
    ctx: ServiceContext,
    input: GetPlanInput,
  ): Promise<Result<PlanOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.planRepo.findById(input.planId);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Plan", input.planId);
      }
      return toOutput(result.value);
    });
  }

  /** Retrieve a single plan by its URL-friendly slug. */
  async getBySlug(
    ctx: ServiceContext,
    input: GetPlanBySlugInput,
  ): Promise<Result<PlanOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.planRepo.findByName(input.slug);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Plan", input.slug);
      }
      return toOutput(result.value);
    });
  }

  /** List plans with optional filtering by interval and active status. */
  async list(
    ctx: ServiceContext,
    input: ListPlansInput,
  ): Promise<Result<Page<PlanOutput>, AppError>> {
    return serviceCall(async () => {
      const page = await this.planRepo.list(
        {
          billingInterval: input.interval,
          isActive: input.active,
        },
        { cursor: input.cursor, limit: input.limit ?? 20 },
      );
      return {
        ...page,
        items: page.items.map(toOutput),
      };
    });
  }

  /** Apply a partial update to an existing plan. Requires admin role. */
  async update(
    ctx: ServiceContext,
    planId: string,
    input: UpdatePlanInput,
  ): Promise<Result<PlanOutput, AppError>> {
    this.log(ctx, "info", "plan.update", { planId });
    return serviceCall(async () => {
      assertAdmin(ctx, "update plan");
      const result = await this.planRepo.update(planId, input);
      if (!isOk(result)) {
        throw new ResourceNotFoundError("Plan", planId);
      }
      return toOutput(result.value);
    });
  }

  /** Deactivate a plan so it cannot accept new subscriptions. Requires admin role. */
  async deactivate(
    ctx: ServiceContext,
    planId: string,
  ): Promise<Result<PlanOutput, AppError>> {
    this.log(ctx, "info", "plan.deactivate", { planId });
    return serviceCall(async () => {
      assertAdmin(ctx, "deactivate plan");
      const existing = await this.planRepo.findById(planId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Plan", planId);
      }
      if (!existing.value.active) {
        throw new PreconditionFailedError("Plan is already inactive.");
      }
      const result = await this.planRepo.update(planId, { active: false });
      if (!isOk(result)) throw result.error;
      return toOutput(result.value);
    });
  }

  /** Permanently delete a plan. Only inactive plans with no active subscriptions may be removed. Requires admin role. */
  async delete(
    ctx: ServiceContext,
    planId: string,
  ): Promise<Result<void, AppError>> {
    this.log(ctx, "info", "plan.delete", { planId });
    return serviceCall(async () => {
      assertAdmin(ctx, "delete plan");
      const existing = await this.planRepo.findById(planId);
      if (!isOk(existing)) {
        throw new ResourceNotFoundError("Plan", planId);
      }
      if (existing.value.active) {
        throw new PreconditionFailedError(
          "Cannot delete an active plan. Deactivate it first.",
        );
      }
      const result = await this.planRepo.delete(planId);
      if (!isOk(result)) throw result.error;
      return undefined;
    });
  }
}
