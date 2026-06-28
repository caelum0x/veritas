// Status subscription: email/webhook subscribers for status change notifications.
import { z } from "zod";
import { newId } from "@veritas/core";

export const SubscriptionChannelSchema = z.enum(["email", "webhook"]);
export type SubscriptionChannel = z.infer<typeof SubscriptionChannelSchema>;

export const StatusSubscriptionSchema = z.object({
  id: z.string(),
  channel: SubscriptionChannelSchema,
  endpoint: z.string().min(1),
  componentIds: z.array(z.string()),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StatusSubscription = z.infer<typeof StatusSubscriptionSchema>;

export const CreateSubscriptionSchema = StatusSubscriptionSchema.omit({
  id: true,
  active: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

/** Port interface for subscription persistence. */
export interface SubscriptionStore {
  list(): Promise<readonly StatusSubscription[]>;
  get(id: string): Promise<StatusSubscription | undefined>;
  create(input: CreateSubscription, now: string): Promise<StatusSubscription>;
  deactivate(id: string, now: string): Promise<StatusSubscription | undefined>;
  forComponents(componentIds: readonly string[]): Promise<readonly StatusSubscription[]>;
}

/** In-memory implementation of SubscriptionStore. */
export class InMemorySubscriptionStore implements SubscriptionStore {
  private readonly store = new Map<string, StatusSubscription>();

  async list(): Promise<readonly StatusSubscription[]> {
    return [...this.store.values()];
  }

  async get(id: string): Promise<StatusSubscription | undefined> {
    return this.store.get(id);
  }

  async create(input: CreateSubscription, now: string): Promise<StatusSubscription> {
    const sub: StatusSubscription = Object.freeze({
      ...input,
      id: newId("sub"),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(sub.id, sub);
    return sub;
  }

  async deactivate(id: string, now: string): Promise<StatusSubscription | undefined> {
    const existing = this.store.get(id);
    if (existing == null) return undefined;
    const updated: StatusSubscription = Object.freeze({
      ...existing,
      active: false,
      updatedAt: now,
    });
    this.store.set(id, updated);
    return updated;
  }

  async forComponents(componentIds: readonly string[]): Promise<readonly StatusSubscription[]> {
    const set = new Set(componentIds);
    return [...this.store.values()].filter(
      (s) => s.active && s.componentIds.some((id) => set.has(id)),
    );
  }
}
