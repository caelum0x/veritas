// Waitlist creation and management
import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import type { WaitlistStore } from "./store.js";
import type { Waitlist } from "./types.js";
import { WaitlistNotFoundError } from "./errors.js";

const CreateWaitlistInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  isOpen: z.boolean().default(true),
  maxCapacity: z.number().int().positive().optional(),
  referralBoostPoints: z.number().int().min(0).default(5),
});
export type CreateWaitlistInput = z.infer<typeof CreateWaitlistInputSchema>;

const UpdateWaitlistInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  isOpen: z.boolean().optional(),
  maxCapacity: z.number().int().positive().optional(),
  referralBoostPoints: z.number().int().min(0).optional(),
});
export type UpdateWaitlistInput = z.infer<typeof UpdateWaitlistInputSchema>;

export function createWaitlist(
  store: WaitlistStore,
  input: CreateWaitlistInput,
): Result<Waitlist> {
  const parsed = CreateWaitlistInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "Invalid waitlist input" } as never);
  }

  const now = new Date().toISOString();
  const waitlist: Waitlist = {
    id: newId("wl"),
    ...parsed.data,
    isOpen: parsed.data.isOpen ?? true,
    referralBoostPoints: parsed.data.referralBoostPoints ?? 5,
    createdAt: now,
    updatedAt: now,
  };

  store.saveWaitlist(waitlist);
  return ok(waitlist);
}

export function getWaitlist(
  store: WaitlistStore,
  id: string,
): Result<Waitlist> {
  const waitlist = store.getWaitlist(id);
  if (!waitlist) return err(new WaitlistNotFoundError(id));
  return ok(waitlist);
}

export function getWaitlistBySlug(
  store: WaitlistStore,
  slug: string,
): Result<Waitlist> {
  const waitlist = store.getWaitlistBySlug(slug);
  if (!waitlist) return err(new WaitlistNotFoundError(slug));
  return ok(waitlist);
}

export function updateWaitlist(
  store: WaitlistStore,
  id: string,
  input: UpdateWaitlistInput,
): Result<Waitlist> {
  const existing = store.getWaitlist(id);
  if (!existing) return err(new WaitlistNotFoundError(id));

  const parsed = UpdateWaitlistInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "Invalid update input" } as never);
  }

  const updated: Waitlist = {
    ...existing,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  store.saveWaitlist(updated);
  return ok(updated);
}

export function listWaitlists(store: WaitlistStore): Result<readonly Waitlist[]> {
  return ok(store.listWaitlists());
}
