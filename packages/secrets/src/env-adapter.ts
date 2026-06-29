// SecretsManager adapter that reads secrets from environment variables.

import { Result, ok, err } from "@veritas/core";
import {
  SecretRef,
  SecretMetadata,
  ResolvedSecret,
  makeSecretRef,
} from "./secret.js";
import { SecretNotFoundError, SecretAccessError } from "./errors.js";
import {
  SecretsManager,
  SetSecretOptions,
  ListSecretsOptions,
  ListSecretsResult,
} from "./manager.js";

/** Converts a secret name like "db/password" → "DB__PASSWORD" env-var key. */
function nameToEnvKey(name: string, prefix: string): string {
  const normalized = name.replace(/[/-]/g, "_").toUpperCase();
  return prefix ? `${prefix}_${normalized}` : normalized;
}

/** Options for constructing an EnvSecretsManager. */
export interface EnvAdapterOptions {
  /** Prefix prepended to all env-var lookups, e.g. "VERITAS". */
  readonly envPrefix?: string;
  /** Custom environment map — defaults to process.env. */
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * Read-only SecretsManager that resolves secrets from environment variables.
 * Write/delete operations are not supported and return SecretAccessError.
 */
export class EnvSecretsManager implements SecretsManager {
  private readonly env: NodeJS.ProcessEnv;
  private readonly prefix: string;

  constructor(options: EnvAdapterOptions = {}) {
    this.env = options.env ?? process.env;
    this.prefix = options.envPrefix ?? "";
  }

  private lookup(name: string): string | undefined {
    const key = nameToEnvKey(name, this.prefix);
    return this.env[key];
  }

  private buildMetadata(name: string): SecretMetadata {
    const now = new Date().toISOString();
    return {
      name,
      version: "env",
      createdAt: now,
      updatedAt: now,
      rotationEnabled: false,
    };
  }

  async getSecret(
    ref: SecretRef
  ): Promise<Result<ResolvedSecret, SecretNotFoundError | SecretAccessError>> {
    const raw = this.lookup(ref.name);
    if (raw === undefined) {
      return err(new SecretNotFoundError(ref.name, ref.version));
    }
    return ok({
      ref: makeSecretRef(ref.name, "env"),
      value: raw,
      metadata: this.buildMetadata(ref.name),
    });
  }

  async setSecret(
    name: string,
    _value: string,
    _options?: SetSecretOptions
  ): Promise<Result<SecretMetadata, SecretAccessError>> {
    return err(new SecretAccessError(name, "env adapter is read-only"));
  }

  async deleteSecret(
    name: string,
    _version?: string
  ): Promise<Result<void, SecretNotFoundError | SecretAccessError>> {
    return err(new SecretAccessError(name, "env adapter is read-only"));
  }

  async listSecrets(
    options: ListSecretsOptions = {}
  ): Promise<Result<ListSecretsResult, SecretAccessError>> {
    const prefix = nameToEnvKey(options.prefix ?? "", this.prefix);
    const now = new Date().toISOString();
    const items: SecretMetadata[] = Object.keys(this.env)
      .filter((k) => k.startsWith(prefix))
      .map((k) => ({
        name: k,
        version: "env",
        createdAt: now,
        updatedAt: now,
        rotationEnabled: false,
      }));
    return ok({ items });
  }

  async secretExists(name: string): Promise<Result<boolean, SecretAccessError>> {
    return ok(this.lookup(name) !== undefined);
  }
}
