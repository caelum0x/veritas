// SecretsManager port — interface for reading, writing, and deleting secrets.
import { Result } from "@veritas/core";
import { SecretRef, SecretMetadata, ResolvedSecret } from "./secret.js";
import { SecretNotFoundError, SecretAccessError } from "./errors.js";

export interface ListSecretsOptions {
  readonly prefix?: string;
  readonly tags?: Record<string, string>;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface ListSecretsResult {
  readonly items: ReadonlyArray<SecretMetadata>;
  readonly nextCursor?: string;
}

export interface SetSecretOptions {
  readonly expiresAt?: string;
  readonly tags?: Record<string, string>;
  readonly rotationEnabled?: boolean;
  readonly description?: string;
}

export interface SecretsManager {
  /**
   * Retrieve the value of a secret by its reference.
   * If version is omitted, returns the latest version.
   */
  getSecret(ref: SecretRef): Promise<Result<ResolvedSecret, SecretNotFoundError | SecretAccessError>>;

  /**
   * Store or update a secret value, returning the new version string.
   */
  setSecret(
    name: string,
    value: string,
    options?: SetSecretOptions
  ): Promise<Result<SecretMetadata, SecretAccessError>>;

  /**
   * Delete a specific version or all versions of a secret.
   */
  deleteSecret(
    name: string,
    version?: string
  ): Promise<Result<void, SecretNotFoundError | SecretAccessError>>;

  /**
   * List secrets with optional filtering.
   */
  listSecrets(options?: ListSecretsOptions): Promise<Result<ListSecretsResult, SecretAccessError>>;

  /**
   * Check whether a secret exists without reading its value.
   */
  secretExists(name: string): Promise<Result<boolean, SecretAccessError>>;
}
