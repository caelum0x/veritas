// Plan DataLoader — batch-loads plans by ID to avoid N+1 queries
import type { Plan } from "@veritas/contracts";
import type { GqlContext } from "../context.js";
import { createLoader } from "../dataloader.js";

export function createPlanLoader(ctx: GqlContext) {
  return createLoader<string, Plan>(async (ids) => {
    const result = await ctx.services.billing.getPlansByIds([...ids]);
    if (!result.ok) return ids.map((id) => new Error(`Plan not found: ${id}`));
    const byId = new Map(result.value.map((plan: Plan) => [plan.id, plan]));
    return ids.map((id) => byId.get(id) ?? new Error(`Plan not found: ${id}`));
  });
}

export type PlanLoader = ReturnType<typeof createPlanLoader>;
