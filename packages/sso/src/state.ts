// OAuth2/OIDC state and nonce generation, storage, and verification.

import { randomBytes } from "node:crypto";
import { ok, err, type Result } from "@veritas/core";
import { InvalidStateError } from "./errors.js";

export interface OAuthState {
  readonly state: string;
  readonly nonce: string;
  readonly providerId: string;
  readonly redirectUri: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

/** Default state TTL: 10 minutes in milliseconds. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** In-memory store — swap for Redis/DB in production via the port interface. */
export interface StateStore {
  save(entry: OAuthState): Promise<void>;
  consume(state: string): Promise<OAuthState | undefined>;
}

/** Default in-memory StateStore implementation. */
export function createInMemoryStateStore(): StateStore {
  const store = new Map<string, OAuthState>();

  return {
    async save(entry: OAuthState): Promise<void> {
      store.set(entry.state, entry);
    },

    async consume(state: string): Promise<OAuthState | undefined> {
      const entry = store.get(state);
      store.delete(state);
      return entry;
    },
  };
}

/** Generates a cryptographically random URL-safe token. */
function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Creates and persists a new OAuth state entry. */
export async function createState(
  store: StateStore,
  providerId: string,
  redirectUri: string,
  nowMs: number = Date.now()
): Promise<OAuthState> {
  const entry: OAuthState = {
    state: randomToken(),
    nonce: randomToken(),
    providerId,
    redirectUri,
    createdAt: nowMs,
    expiresAt: nowMs + STATE_TTL_MS,
  };
  await store.save(entry);
  return entry;
}

/**
 * Consumes and validates the state parameter returned by the IdP callback.
 * Returns InvalidStateError if the state is unknown, expired, or tampered.
 */
export async function consumeState(
  store: StateStore,
  state: string,
  nowMs: number = Date.now()
): Promise<Result<OAuthState, InvalidStateError>> {
  const entry = await store.consume(state);

  if (!entry) {
    return err(new InvalidStateError("state not found or already consumed"));
  }

  if (nowMs > entry.expiresAt) {
    return err(new InvalidStateError("state has expired"));
  }

  return ok(entry);
}
