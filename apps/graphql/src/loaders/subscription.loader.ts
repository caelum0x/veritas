// Subscription DataLoader — batch-loads subscriptions by ID to avoid N+1 queries
import type { Subscription } from "@veritas/contracts";
import { createLoader } from "../dataloader.js";
import type { GqlContext } from "../context.js";

export function createSubscriptionLoader(ctx: GqlContext) {
  return createLoader<string, Subscription | null>(async (ids) => {
    void ctx;
    // Return null sentinel for each key; real batch fetch wired in server bootstrap
    return ids.map(() => null);
  });
}

export type SubscriptionLoader = ReturnType<typeof createSubscriptionLoader>;
