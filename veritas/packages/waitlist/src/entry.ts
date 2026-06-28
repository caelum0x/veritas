// Waitlist entry creation and management
import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import type { WaitlistStore } from "./store.js";
import type { WaitlistEntry } from "./types.js";
import {
  WaitlistNotFoundError,
  WaitlistAlreadyExistsError,
  WaitlistFullError,
  WaitlistClosedError,
} from "./errors.js";
import { computePosition } from "./position.js";

const CreateEntryInputSchema = z.object({
  waitlistId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  referredByCode: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateEntryInput = z.infer<typeof CreateEntryInputSchema>;

function generateReferralCode(): string {
  return newId("ref").slice(-8).toUpperCase();
}

export function createEntry(
  store: WaitlistStore,
  input: CreateEntryInput,
): Result<WaitlistEntry> {
  const parsed = CreateEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "Invalid entry input" } as never);
  }

  const { waitlistId, email, name, referredByCode, metadata } = parsed.data;

  const waitlist = store.getWaitlist(waitlistId);
  if (!waitlist) return err(new WaitlistNotFoundError(waitlistId));

  if (!waitlist.isOpen) return err(new WaitlistClosedError());

  const existing = store.getEntryByEmail(waitlistId, email);
  if (existing) return err(new WaitlistAlreadyExistsError(email));

  if (waitlist.maxCapacity !== undefined) {
    const count = store.countEntries(waitlistId);
    if (count >= waitlist.maxCapacity) return err(new WaitlistFullError(waitlist.maxCapacity));
  }

  const now = new Date().toISOString();
  const entries = store.listEntries(waitlistId);
  const position = computePosition(entries, 0);

  const entry: WaitlistEntry = {
    id: newId("wle"),
    waitlistId,
    email,
    name,
    referralCode: generateReferralCode(),
    referredByCode,
    position,
    boostPoints: 0,
    status: "pending",
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  store.saveEntry(entry);
  return ok(entry);
}

export function getEntry(
  store: WaitlistStore,
  entryId: string,
): Result<WaitlistEntry> {
  const entry = store.getEntry(entryId);
  if (!entry) return err(new WaitlistNotFoundError(entryId));
  return ok(entry);
}

export function listEntries(
  store: WaitlistStore,
  waitlistId: string,
): Result<readonly WaitlistEntry[]> {
  const waitlist = store.getWaitlist(waitlistId);
  if (!waitlist) return err(new WaitlistNotFoundError(waitlistId));
  return ok(store.listEntries(waitlistId));
}
