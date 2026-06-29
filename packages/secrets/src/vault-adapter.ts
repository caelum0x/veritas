// Port interface and mock implementation for a Vault-style secrets backend.

import { Result, ok, err } from "@veritas/core";
import {
  SecretRef,
  SecretMetadata,
  ResolvedSecret,
  makeSecretRef,
  secretValue,
} from "./secret.js";
import {
  SecretNotFoundError,
  SecretAccessError,
} from "./errors.js";
import { SecretsManager, SetSecretOptions, ListSecretsOptions, ListSecretsResult } from "./manager.js";

/** Port interface for a Vault-compatible backend. */
export interface VaultAdapter {
  read(path: string, version?: string): Promise<Result<{ value: string; version: string; metadata: Record<string, string> }, Error>>;
  write(path: string, value: string, metadata?: Record<string, string>): Promise<Result<string, Error>>;
  delete(path: string, version?: string): Promise<Result<void, Error>>;
  list(prefix: string): Promise<Result<string[], Error>>;
  exists(path: string): Promise<Result<boolean, Error>>;
}

/** In-memory mock Vault adapter for development and testing. */
export class MockVaultAdapter implements VaultAdapter {
  private readonly store = new Map<string, Array<{ value: string; version: string; metadata: Record<string, string> }>>();

  async read(
    path: string,
    version?: string
  ): Promise<Result<{ value: string; version: string; metadata: Record<string, string> }, Error>> {
    const versions = this.store.get(path);
    if (!versions || versions.length === 0) {
      return err(new Error(`Vault: path not found: ${path}`));
    }
    if (version !== undefined) {
      const entry = versions.find((v) => v.version === version);
      if (!entry) {
        return err(new Error(`Vault: version ${version} not found for path: ${path}`));
      }
      return ok(entry);
    }
    return ok(versions[versions.length - 1]!);
  }

  async write(
    path: string,
    value: string,
    metadata: Record<string, string> = {}
  ): Promise<Result<string, Error>> {
    const existing = this.store.get(path) ?? [];
    const version = String(existing.length + 1);
    const now = new Date().toISOString();
    this.store.set(path, [
      ...existing,
      { value, version, metadata: { ...metadata, createdAt: now, updatedAt: now } },
    ]);
    return ok(version);
  }

  async delete(path: string, version?: string): Promise<Result<void, Error>> {
    if (!this.store.has(path)) {
      return err(new Error(`Vault: path not found: ${path}`));
    }
    if (version !== undefined) {
      const versions = (this.store.get(path) ?? []).filter((v) => v.version !== version);
      this.store.set(path, versions);
    } else {
      this.store.delete(path);
    }
    return ok(undefined);
  }

  async list(prefix: string): Promise<Result<string[], Error>> {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix));
    return ok(keys);
  }

  async exists(path: string): Promise<Result<boolean, Error>> {
    return ok(this.store.has(path));
  }
}

/** SecretsManager implementation backed by a VaultAdapter. */
export class VaultSecretsManager implements SecretsManager {
  constructor(
    private readonly adapter: VaultAdapter,
    private readonly pathPrefix: string = "secret/data/"
  ) {}

  private toPath(name: string): string {
    return `${this.pathPrefix}${name}`;
  }

  private toMetadata(
    name: string,
    version: string,
    raw: Record<string, string>
  ): SecretMetadata {
    const now = new Date().toISOString();
    return {
      name,
      version,
      createdAt: raw["createdAt"] ?? now,
      updatedAt: raw["updatedAt"] ?? now,
      expiresAt: raw["expiresAt"],
      tags: Object.fromEntries(
        Object.entries(raw).filter(([k]) => k.startsWith("tag:")).map(([k, v]) => [k.slice(4), v])
      ),
      rotationEnabled: raw["rotationEnabled"] === "true",
    };
  }

  async getSecret(
    ref: SecretRef
  ): Promise<Result<ResolvedSecret, SecretNotFoundError | SecretAccessError>> {
    const path = this.toPath(ref.name);
    const result = await this.adapter.read(path, ref.version);
    if (!result.ok) {
      return err(new SecretNotFoundError(ref.name, ref.version));
    }
    const { value, version, metadata } = result.value;
    return ok({
      ref: makeSecretRef(ref.name, version),
      value: secretValue(value) as unknown as string,
      metadata: this.toMetadata(ref.name, version, metadata),
    });
  }

  async setSecret(
    name: string,
    value: string,
    options: SetSecretOptions = {}
  ): Promise<Result<SecretMetadata, SecretAccessError>> {
    const path = this.toPath(name);
    const rawMeta: Record<string, string> = {};
    if (options.expiresAt) rawMeta["expiresAt"] = options.expiresAt;
    if (options.rotationEnabled) rawMeta["rotationEnabled"] = "true";
    if (options.description) rawMeta["description"] = options.description;
    for (const [k, v] of Object.entries(options.tags ?? {})) {
      rawMeta[`tag:${k}`] = v;
    }
    const result = await this.adapter.write(path, value, rawMeta);
    if (!result.ok) {
      return err(new SecretAccessError(name, result.error.message));
    }
    const version = result.value;
    const now = new Date().toISOString();
    return ok({
      name,
      version,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
      rotationEnabled: options.rotationEnabled ?? false,
    });
  }

  async deleteSecret(
    name: string,
    version?: string
  ): Promise<Result<void, SecretNotFoundError | SecretAccessError>> {
    const path = this.toPath(name);
    const result = await this.adapter.delete(path, version);
    if (!result.ok) {
      return err(new SecretNotFoundError(name, version));
    }
    return ok(undefined);
  }

  async listSecrets(
    options: ListSecretsOptions = {}
  ): Promise<Result<ListSecretsResult, SecretAccessError>> {
    const prefix = this.toPath(options.prefix ?? "");
    const result = await this.adapter.list(prefix);
    if (!result.ok) {
      return err(new SecretAccessError("*", result.error.message));
    }
    const limit = options.limit ?? result.value.length;
    const allKeys = result.value;
    const startIndex = options.cursor ? parseInt(options.cursor, 10) : 0;
    const page = allKeys.slice(startIndex, startIndex + limit);
    const now = new Date().toISOString();
    const items: SecretMetadata[] = page.map((path) => ({
      name: path.slice(this.pathPrefix.length),
      version: "latest",
      createdAt: now,
      updatedAt: now,
      rotationEnabled: false,
    }));
    const nextCursor =
      startIndex + limit < allKeys.length ? String(startIndex + limit) : undefined;
    return ok({ items, nextCursor });
  }

  async secretExists(name: string): Promise<Result<boolean, SecretAccessError>> {
    const path = this.toPath(name);
    const result = await this.adapter.exists(path);
    if (!result.ok) {
      return err(new SecretAccessError(name, result.error.message));
    }
    return ok(result.value);
  }
}
