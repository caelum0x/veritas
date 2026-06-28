// Application service for admin plan management — delegates to @veritas/services PlanService.
import type { Deps } from "../../container.js";
import { makeServiceContext } from "@veritas/services";
import type { PlanService } from "@veritas/services";
import type { Result, AppError, Page } from "@veritas/core";
import { epochToIso, newId } from "@veritas/core";
import type { CreatePlanBody, UpdatePlanBody, ListPlansQuery } from "./plans.schema.js";
import { toPlanResponse, type PlanResponse } from "./plans.mapper.js";

export interface PlansPage {
  readonly items: readonly PlanResponse[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Build a system-level ServiceContext for admin operations. */
function adminContext() {
  return makeServiceContext(
    { userId: "admin-api", orgId: undefined, roles: ["admin", "system"], apiKeyId: undefined },
    newId("tr"),
    newId("req"),
    epochToIso(Date.now()),
  );
}

/** Admin feature service for billing plan CRUD. Wraps @veritas/services PlanService. */
export class PlansService {
  private readonly planService: PlanService;
  private readonly logger: Deps["logger"];

  constructor(deps: Pick<Deps, "planService" | "logger">) {
    this.planService = deps.planService;
    this.logger = deps.logger;
  }

  /** List billing plans with optional interval/active filters and cursor pagination. */
  async list(query: ListPlansQuery): Promise<Result<PlansPage, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.list(ctx, {
      interval: query.interval,
      active: query.active,
      cursor: query.cursor,
      limit: query.limit,
    });
    if (!result.ok) return result;
    const page = result.value as Page<{ id: string; slug: string; name: string; price: { currency: "USDC"; amount: string }; interval: string; includedVerifications: number; overagePrice: { currency: "USDC"; amount: string } | null; active: boolean; createdAt: string; updatedAt: string }>;
    return {
      ok: true,
      value: {
        items: page.items.map(toPlanResponse),
        nextCursor: page.nextCursor ?? null,
        total: page.total,
      },
    };
  }

  /** Retrieve a single plan by its opaque id. */
  async getById(planId: string): Promise<Result<PlanResponse, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.getById(ctx, { planId });
    if (!result.ok) return result;
    return { ok: true, value: toPlanResponse(result.value) };
  }

  /** Retrieve a single plan by its URL slug. */
  async getBySlug(slug: string): Promise<Result<PlanResponse, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.getBySlug(ctx, { slug });
    if (!result.ok) return result;
    return { ok: true, value: toPlanResponse(result.value) };
  }

  /** Create a new billing plan (requires admin). */
  async create(body: CreatePlanBody): Promise<Result<PlanResponse, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.create(ctx, {
      slug: body.slug,
      name: body.name,
      price: body.price,
      interval: body.interval,
      includedVerifications: body.includedVerifications,
      overagePrice: body.overagePrice ?? null,
      active: body.active ?? true,
    });
    if (!result.ok) return result;
    this.logger.info("plan.created", { slug: body.slug });
    return { ok: true, value: toPlanResponse(result.value) };
  }

  /** Apply a partial update to an existing plan. */
  async update(planId: string, body: UpdatePlanBody): Promise<Result<PlanResponse, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.update(ctx, planId, body);
    if (!result.ok) return result;
    this.logger.info("plan.updated", { planId });
    return { ok: true, value: toPlanResponse(result.value) };
  }

  /** Deactivate a plan (blocks new subscriptions). */
  async deactivate(planId: string): Promise<Result<PlanResponse, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.deactivate(ctx, planId);
    if (!result.ok) return result;
    this.logger.info("plan.deactivated", { planId });
    return { ok: true, value: toPlanResponse(result.value) };
  }

  /** Permanently delete an inactive plan. */
  async delete(planId: string): Promise<Result<void, AppError>> {
    const ctx = adminContext();
    const result = await this.planService.delete(ctx, planId);
    if (!result.ok) return result;
    this.logger.info("plan.deleted", { planId });
    return { ok: true, value: undefined };
  }
}
