// In-memory identity registry: CRUD for AgentIdentity records keyed by DID.
import { ok, err, newId, epochToIso } from "@veritas/core";
import type { Result, IsoTimestamp } from "@veritas/core";
import { IdentityNotFoundError, IdentityConflictError } from "./errors.js";
import type { AgentIdentity, AgentIdentityId, AgentSigningKey } from "./types.js";
import { asAgentIdentityId } from "./types.js";
import type { Did } from "@veritas/did";

/** Options for registering a new agent identity. */
export interface RegisterIdentityOptions {
  readonly did: Did;
  readonly displayName?: string;
  readonly initialKey: AgentSigningKey;
}

/** Options for updating an agent identity's display name. */
export interface UpdateIdentityOptions {
  readonly displayName?: string;
}

/** Port interface for an identity registry backend. */
export interface IdentityRegistryPort {
  register(opts: RegisterIdentityOptions): Promise<Result<AgentIdentity, IdentityConflictError>>;
  findByDid(did: Did): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  findById(id: AgentIdentityId): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  update(id: AgentIdentityId, opts: UpdateIdentityOptions): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  addKey(id: AgentIdentityId, key: AgentSigningKey): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  revokeKey(id: AgentIdentityId, keyId: string): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  deactivate(id: AgentIdentityId): Promise<Result<AgentIdentity, IdentityNotFoundError>>;
  list(): Promise<readonly AgentIdentity[]>;
}

/** In-memory implementation of IdentityRegistryPort. */
export class InMemoryIdentityRegistry implements IdentityRegistryPort {
  private readonly byId = new Map<AgentIdentityId, AgentIdentity>();
  private readonly byDid = new Map<Did, AgentIdentityId>();

  async register(opts: RegisterIdentityOptions): Promise<Result<AgentIdentity, IdentityConflictError>> {
    if (this.byDid.has(opts.did)) {
      return err(new IdentityConflictError(opts.did));
    }
    const now = epochToIso(Date.now()) as IsoTimestamp;
    const id = asAgentIdentityId(newId("identity"));
    const identity: AgentIdentity = Object.freeze({
      id,
      did: opts.did,
      displayName: opts.displayName,
      keys: Object.freeze([opts.initialKey]),
      createdAt: now,
      updatedAt: now,
      deactivated: false,
    });
    this.byId.set(id, identity);
    this.byDid.set(opts.did, id);
    return ok(identity);
  }

  async findByDid(did: Did): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const id = this.byDid.get(did);
    if (!id) return err(new IdentityNotFoundError(did));
    const identity = this.byId.get(id);
    if (!identity) return err(new IdentityNotFoundError(did));
    return ok(identity);
  }

  async findById(id: AgentIdentityId): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const identity = this.byId.get(id);
    if (!identity) return err(new IdentityNotFoundError(id));
    return ok(identity);
  }

  async update(
    id: AgentIdentityId,
    opts: UpdateIdentityOptions,
  ): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const existing = this.byId.get(id);
    if (!existing) return err(new IdentityNotFoundError(id));
    const updated: AgentIdentity = Object.freeze({
      ...existing,
      displayName: opts.displayName ?? existing.displayName,
      updatedAt: epochToIso(Date.now()) as IsoTimestamp,
    });
    this.byId.set(id, updated);
    return ok(updated);
  }

  async addKey(
    id: AgentIdentityId,
    key: AgentSigningKey,
  ): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const existing = this.byId.get(id);
    if (!existing) return err(new IdentityNotFoundError(id));
    // Mark all existing keys as not-current when adding a new current key
    const updatedKeys: readonly AgentSigningKey[] = key.isCurrent
      ? Object.freeze([
          ...existing.keys.map((k) => Object.freeze({ ...k, isCurrent: false })),
          key,
        ])
      : Object.freeze([...existing.keys, key]);
    const updated: AgentIdentity = Object.freeze({
      ...existing,
      keys: updatedKeys,
      updatedAt: epochToIso(Date.now()) as IsoTimestamp,
    });
    this.byId.set(id, updated);
    return ok(updated);
  }

  async revokeKey(
    id: AgentIdentityId,
    keyId: string,
  ): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const existing = this.byId.get(id);
    if (!existing) return err(new IdentityNotFoundError(id));
    const revokedAt = epochToIso(Date.now()) as IsoTimestamp;
    const updatedKeys: readonly AgentSigningKey[] = Object.freeze(
      existing.keys.map((k) =>
        k.keyId === keyId
          ? Object.freeze({ ...k, isCurrent: false, revokedAt })
          : k,
      ),
    );
    const updated: AgentIdentity = Object.freeze({
      ...existing,
      keys: updatedKeys,
      updatedAt: revokedAt,
    });
    this.byId.set(id, updated);
    return ok(updated);
  }

  async deactivate(
    id: AgentIdentityId,
  ): Promise<Result<AgentIdentity, IdentityNotFoundError>> {
    const existing = this.byId.get(id);
    if (!existing) return err(new IdentityNotFoundError(id));
    const updated: AgentIdentity = Object.freeze({
      ...existing,
      deactivated: true,
      updatedAt: epochToIso(Date.now()) as IsoTimestamp,
    });
    this.byId.set(id, updated);
    return ok(updated);
  }

  async list(): Promise<readonly AgentIdentity[]> {
    return Object.freeze([...this.byId.values()]);
  }
}

/** Singleton in-memory registry instance for the default module context. */
export const defaultRegistry: IdentityRegistryPort = new InMemoryIdentityRegistry();
