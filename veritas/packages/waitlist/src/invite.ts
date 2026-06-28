// Invite generation and acceptance for waitlist entries
import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import type { WaitlistStore } from "./store.js";
import type { Invite, WaitlistEntry } from "./types.js";
import {
  WaitlistNotFoundError,
  InviteAlreadySentError,
  WaitlistClosedError,
} from "./errors.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SendInviteInputSchema = z.object({
  waitlistId: z.string().min(1),
  entryId: z.string().min(1),
});
export type SendInviteInput = z.infer<typeof SendInviteInputSchema>;

const AcceptInviteInputSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;

export interface AcceptInviteResult {
  readonly invite: Invite;
  readonly entry: WaitlistEntry;
}

export function sendInvite(
  store: WaitlistStore,
  input: SendInviteInput,
): Result<Invite> {
  const parsed = SendInviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "Invalid invite input" } as never);
  }

  const { waitlistId, entryId } = parsed.data;

  const waitlist = store.getWaitlist(waitlistId);
  if (!waitlist) return err(new WaitlistNotFoundError(waitlistId));

  const entry = store.getEntry(entryId);
  if (!entry) return err(new WaitlistNotFoundError(entryId));

  const existingInvites = store.listInvitesByEntry(entryId);
  const pendingInvite = existingInvites.find((i) => !i.usedAt);
  if (pendingInvite) return err(new InviteAlreadySentError(entryId));

  if (entry.status === "invited" || entry.status === "accepted") {
    return err(new WaitlistClosedError());
  }

  const now = new Date();
  const invite: Invite = {
    id: newId("inv"),
    waitlistId,
    entryId,
    email: entry.email,
    token: newId("tok"),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
  };

  const updatedEntry: WaitlistEntry = {
    ...entry,
    status: "invited",
    invitedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  store.saveInvite(invite);
  store.saveEntry(updatedEntry);

  return ok(invite);
}

export function acceptInvite(
  store: WaitlistStore,
  input: AcceptInviteInput,
): Result<AcceptInviteResult> {
  const parsed = AcceptInviteInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "Invalid accept input" } as never);
  }

  const { token } = parsed.data;
  const invite = store.getInviteByToken(token);
  if (!invite) return err(new WaitlistNotFoundError(token));

  if (invite.usedAt) {
    return err(new InviteAlreadySentError(invite.entryId));
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return err(new WaitlistClosedError());
  }

  const entry = store.getEntry(invite.entryId);
  if (!entry) return err(new WaitlistNotFoundError(invite.entryId));

  const now = new Date().toISOString();

  const usedInvite: Invite = { ...invite, usedAt: now };
  const acceptedEntry: WaitlistEntry = {
    ...entry,
    status: "accepted",
    acceptedAt: now,
    updatedAt: now,
  };

  store.saveInvite(usedInvite);
  store.saveEntry(acceptedEntry);

  return ok({ invite: usedInvite, entry: acceptedEntry });
}

export function getInviteByToken(
  store: WaitlistStore,
  token: string,
): Result<Invite> {
  const invite = store.getInviteByToken(token);
  if (!invite) return err(new WaitlistNotFoundError(token));
  return ok(invite);
}
