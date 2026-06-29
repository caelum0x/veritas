// SSO session lifecycle: create, validate, and revoke SSO sessions.

import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { SsoError } from "./errors.js";
import type { SsoPrincipal, SsoSession } from "./types.js";
import type { UserId } from "@veritas/core";

/** Default SSO session TTL: 8 hours. */
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const CreateSsoSessionSchema = z.object({
  providerId: z.string().min(1),
  userId: z.string().min(1),
  principal: z.object({
    externalId: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    groups: z.array(z.string()),
    rawAttributes: z.record(z.union([z.string(), z.array(z.string())])),
  }),
  ttlMs: z.number().int().positive().optional(),
});

export type CreateSsoSessionInput = z.infer<typeof CreateSsoSessionSchema>;

/** Port interface for SSO session persistence. */
export interface SsoSessionStore {
  save(session: SsoSession): Promise<void>;
  findById(sessionId: string): Promise<SsoSession | undefined>;
  revoke(sessionId: string): Promise<void>;
  revokeAllForUser(userId: UserId): Promise<void>;
}

/** In-memory SSO session store for development and tests. */
export function createInMemorySsoSessionStore(): SsoSessionStore {
  const store = new Map<string, SsoSession>();

  return {
    async save(session: SsoSession): Promise<void> {
      store.set(session.sessionId, session);
    },

    async findById(sessionId: string): Promise<SsoSession | undefined> {
      return store.get(sessionId);
    },

    async revoke(sessionId: string): Promise<void> {
      store.delete(sessionId);
    },

    async revokeAllForUser(userId: UserId): Promise<void> {
      for (const [key, session] of store) {
        if (session.userId === userId) {
          store.delete(key);
        }
      }
    },
  };
}

/** Creates a new SSO session entry. */
export function createSsoSession(
  input: CreateSsoSessionInput,
  nowMs: number = Date.now()
): Result<SsoSession, SsoError> {
  const parsed = CreateSsoSessionSchema.safeParse(input);
  if (!parsed.success) {
    return err(new SsoError("Invalid SSO session input", parsed.error));
  }

  const { providerId, userId, principal, ttlMs } = parsed.data;

  const session: SsoSession = {
    sessionId: newId("sso"),
    providerId,
    userId: userId as UserId,
    principal: principal as SsoPrincipal,
    createdAt: nowMs,
    expiresAt: nowMs + (ttlMs ?? DEFAULT_SESSION_TTL_MS),
  };

  return ok(session);
}

/** Retrieves and validates an SSO session from the store. */
export async function getValidSsoSession(
  store: SsoSessionStore,
  sessionId: string,
  nowMs: number = Date.now()
): Promise<Result<SsoSession, SsoError>> {
  const session = await store.findById(sessionId);

  if (session === undefined) {
    return err(new SsoError(`SSO session not found: ${sessionId}`));
  }

  if (nowMs >= session.expiresAt) {
    await store.revoke(sessionId);
    return err(new SsoError(`SSO session has expired: ${sessionId}`));
  }

  return ok(session);
}

/** Revokes a single SSO session. */
export async function revokeSsoSession(
  store: SsoSessionStore,
  sessionId: string
): Promise<Result<void, SsoError>> {
  try {
    await store.revoke(sessionId);
    return ok(undefined);
  } catch (cause) {
    return err(new SsoError(`Failed to revoke SSO session: ${sessionId}`, cause));
  }
}

/** Revokes all SSO sessions belonging to a user. */
export async function revokeAllUserSsoSessions(
  store: SsoSessionStore,
  userId: UserId
): Promise<Result<void, SsoError>> {
  try {
    await store.revokeAllForUser(userId);
    return ok(undefined);
  } catch (cause) {
    return err(new SsoError(`Failed to revoke sessions for user: ${userId}`, cause));
  }
}

/** Returns true if the session is currently active (not expired, not undefined). */
export function isSsoSessionActive(
  session: SsoSession,
  nowMs: number = Date.now()
): boolean {
  return nowMs < session.expiresAt;
}
