// Agent identity: DID + associated signing keys for a Veritas agent.
import { ok, err } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import type { Did } from "@veritas/did";
import type { AgentIdentity, AgentIdentityId, AgentSigningKey } from "./types.js";
import { asAgentIdentityId } from "./types.js";
import type { IdentityError } from "./errors.js";
import { IdentityNotFoundError, IdentityConflictError } from "./errors.js";
import { randomHex } from "@veritas/crypto";

/** In-memory store of agent identities keyed by DID. */
const store = new Map<string, AgentIdentity>();

/** Parameters required to create a new agent identity. */
export interface CreateAgentIdentityParams {
  readonly did: Did;
  readonly displayName?: string;
  readonly initialKey: AgentSigningKey;
}

/** Create a new agent identity and persist it in the in-memory store. */
export function createAgentIdentity(
  params: CreateAgentIdentityParams,
): Result<AgentIdentity, IdentityError> {
  if (store.has(params.did)) {
    return err(new IdentityConflictError(params.did));
  }
  const now = new Date().toISOString() as IsoTimestamp;
  const identity: AgentIdentity = Object.freeze({
    id: asAgentIdentityId(randomHex(16)),
    did: params.did,
    displayName: params.displayName,
    keys: Object.freeze([params.initialKey]),
    createdAt: now,
    updatedAt: now,
    deactivated: false,
  });
  store.set(params.did, identity);
  return ok(identity);
}

/** Retrieve an agent identity by its DID. */
export function getAgentIdentity(
  did: Did,
): Result<AgentIdentity, IdentityError> {
  const identity = store.get(did);
  if (identity === undefined) {
    return err(new IdentityNotFoundError(did));
  }
  return ok(identity);
}

/** Retrieve an agent identity by its id. */
export function getAgentIdentityById(
  id: AgentIdentityId,
): Result<AgentIdentity, IdentityError> {
  for (const identity of store.values()) {
    if (identity.id === id) return ok(identity);
  }
  return err(new IdentityNotFoundError(id));
}

/** Add a new signing key to an agent identity (immutable replacement). */
export function addSigningKey(
  did: Did,
  key: AgentSigningKey,
): Result<AgentIdentity, IdentityError> {
  const existing = store.get(did);
  if (existing === undefined) {
    return err(new IdentityNotFoundError(did));
  }
  const updated: AgentIdentity = Object.freeze({
    ...existing,
    keys: Object.freeze([...existing.keys, key]),
    updatedAt: new Date().toISOString() as IsoTimestamp,
  });
  store.set(did, updated);
  return ok(updated);
}

/** Deactivate an agent identity (immutable replacement). */
export function deactivateAgentIdentity(
  did: Did,
): Result<AgentIdentity, IdentityError> {
  const existing = store.get(did);
  if (existing === undefined) {
    return err(new IdentityNotFoundError(did));
  }
  const updated: AgentIdentity = Object.freeze({
    ...existing,
    deactivated: true,
    updatedAt: new Date().toISOString() as IsoTimestamp,
  });
  store.set(did, updated);
  return ok(updated);
}

/** List all stored agent identities. */
export function listAgentIdentities(): readonly AgentIdentity[] {
  return Array.from(store.values());
}

/** Remove an agent identity by DID (hard delete). */
export function removeAgentIdentity(
  did: Did,
): Result<void, IdentityError> {
  if (!store.has(did)) {
    return err(new IdentityNotFoundError(did));
  }
  store.delete(did);
  return ok(undefined);
}
