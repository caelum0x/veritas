// ApiKeyRepository interface for hashed REST API credential persistence.

import type { Result, Page } from "@veritas/core";
import type { ApiKey, CreateApiKey } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Update shape for ApiKey: only allow revoking and scope changes. */
export interface UpdateApiKey {
  readonly scopes?: string[];
  readonly revokedAt?: string | null;
  readonly lastUsedAt?: string | null;
}

/** Repository interface for ApiKey entities. */
export interface ApiKeyRepository extends BaseRepository<ApiKey, CreateApiKey, UpdateApiKey> {
  /** Find an ApiKey by its prefix (first N chars of the plaintext key). */
  findByPrefix(prefix: string): Promise<Result<ApiKey>>;

  /** Find all active (non-revoked, non-expired) keys for an organization. */
  findByOrganizationId(organizationId: string, options?: QueryOptions<ApiKey>): Promise<Result<Page<ApiKey>>>;

  /** Find all active keys for a specific user within an organization. */
  findByUserId(userId: string, options?: QueryOptions<ApiKey>): Promise<Result<Page<ApiKey>>>;

  /** Look up a key by its bcrypt/sha256 hash for authentication. */
  findByHashedKey(hashedKey: string): Promise<Result<ApiKey>>;
}
