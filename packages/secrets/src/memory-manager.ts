// In-memory SecretsManager implementation for tests and local development.
import { ok, err, Result } from "@veritas/core";
import { SecretRef, SecretMetadata, ResolvedSecret } from "./secret.js";
import {
  SecretsManager,
  SetSecretOptions,
  ListSecretsOptions,
  ListSecretsResult,
} from "./manager.js";
import { SecretNotFoundError, SecretAccessError } from "./errors.js";

interface StoredSecret {
  readonly versions: Map<string, string>;
  readonly latestVersion: string;
  readonly metadata: SecretMetadata;
}

export class InMemorySecretsManager implements SecretsManager {
  private readonly store = new Map<string, StoredSecret>();
  private versionCounter = 0;

  private nextVersion(): string {
    return String(++this.versionCounter);
  }

  async getSecret(
    ref: SecretRef
  ): Promise<Result<ResolvedSecret, SecretNotFoundError | SecretAccessError>> {
    const entry = this.store.get(ref.name);
    if (!entry) {
      return err(new SecretNotFoundError(ref.name, ref.version));
    }
    const version = ref.version ?? entry.latestVersion;
    const value = entry.versions.get(version);
    if (value === undefined) {
      return err(new SecretNotFoundError(ref.name, version));
    }
    return ok({
      ref: { name: ref.name, version },
      value,
      metadata: { ...entry.metadata, version },
    });
  }

  async setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<Result<SecretMetadata, SecretAccessError>> {
    const now = new Date().toISOString();
    const version = this.nextVersion();
    const existing = this.store.get(name);
    const createdAt = existing?.metadata.createdAt ?? now;
    const versions = existing
      ? new Map(existing.versions)
      : new Map<string, string>();
    versions.set(version, value);
    const metadata: SecretMetadata = {
      name,
      version,
      createdAt,
      updatedAt: now,
      expiresAt: options?.expiresAt,
      tags: options?.tags,
      rotationEnabled: options?.rotationEnabled ?? false,
    };
    this.store.set(name, { versions, latestVersion: version, metadata });
    return ok(metadata);
  }

  async deleteSecret(
    name: string,
    version?: string
  ): Promise<Result<void, SecretNotFoundError | SecretAccessError>> {
    const entry = this.store.get(name);
    if (!entry) {
      return err(new SecretNotFoundError(name, version));
    }
    if (version) {
      if (!entry.versions.has(version)) {
        return err(new SecretNotFoundError(name, version));
      }
      const versions = new Map(entry.versions);
      versions.delete(version);
      if (versions.size === 0) {
        this.store.delete(name);
      } else {
        const latestVersion =
          version === entry.latestVersion
            ? [...versions.keys()].at(-1)!
            : entry.latestVersion;
        this.store.set(name, { ...entry, versions, latestVersion });
      }
    } else {
      this.store.delete(name);
    }
    return ok(undefined);
  }

  async listSecrets(
    options?: ListSecretsOptions
  ): Promise<Result<ListSecretsResult, SecretAccessError>> {
    let items: SecretMetadata[] = [];
    for (const [name, entry] of this.store) {
      if (options?.prefix && !name.startsWith(options.prefix)) continue;
      if (options?.tags) {
        const match = Object.entries(options.tags).every(
          ([k, v]) => entry.metadata.tags?.[k] === v
        );
        if (!match) continue;
      }
      items.push(entry.metadata);
    }
    const limit = options?.limit ?? items.length;
    const startIdx = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const page = items.slice(startIdx, startIdx + limit);
    const nextCursor =
      startIdx + limit < items.length
        ? String(startIdx + limit)
        : undefined;
    return ok({ items: page, nextCursor });
  }

  async secretExists(
    name: string
  ): Promise<Result<boolean, SecretAccessError>> {
    return ok(this.store.has(name));
  }
}
