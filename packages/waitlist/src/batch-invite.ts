// Batch invite processing — sends invites to the next N waiting entries.
import { ok, err, type Result } from "@veritas/core";
import { newId, epochToIso } from "@veritas/core";
import type { WaitlistStore } from "./store.js";
import type { Invite, WaitlistEntry } from "./types.js";
import { WaitlistNotFoundError } from "./errors.js";

export interface BatchInviteOptions {
  waitlistId: string;
  count: number;
  /** Hours until invite expires. Default 48. */
  expiryHours?: number;
}

export interface BatchInviteSummary {
  invited: ReadonlyArray<{ entryId: string; email: string; token: string }>;
  skipped: number;
  total: number;
}

function generateToken(): string {
  return newId("tok");
}

function addHours(iso: string, hours: number): string {
  const ms = new Date(iso).getTime() + hours * 3_600_000;
  return epochToIso(ms);
}

export function batchInvite(
  store: WaitlistStore,
  options: BatchInviteOptions,
): Result<BatchInviteSummary> {
  const { waitlistId, count, expiryHours = 48 } = options;

  const waitlist = store.getWaitlist(waitlistId);
  if (waitlist === undefined) {
    return err(new WaitlistNotFoundError(waitlistId));
  }

  const waiting = store
    .listEntries(waitlistId)
    .filter((e) => e.status === "pending")
    .slice(0, count);

  const now = epochToIso(Date.now());
  const expiresAt = addHours(now, expiryHours);

  const invited: Array<{ entryId: string; email: string; token: string }> = [];

  for (const entry of waiting) {
    // Skip if an invite already exists for this entry.
    const existing = store.listInvitesByEntry(entry.id);
    if (existing.length > 0) continue;

    const token = generateToken();
    const invite: Invite = {
      id: newId("inv"),
      waitlistId,
      entryId: entry.id,
      email: entry.email,
      token,
      expiresAt,
      createdAt: now,
    };
    store.saveInvite(invite);

    const updatedEntry: WaitlistEntry = {
      ...entry,
      status: "invited",
      invitedAt: now,
      updatedAt: now,
    };
    store.saveEntry(updatedEntry);

    invited.push({ entryId: entry.id, email: entry.email, token });
  }

  return ok({
    invited,
    skipped: waiting.length - invited.length,
    total: invited.length,
  });
}
