// Api-key application service: issues, validates, revokes, and lists REST API credentials.
import { ok, err, isErr, sha256Hex, newId } from "@veritas/core";
import type { Result, Logger, Page } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { ApiKey } from "@veritas/contracts";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  InsufficientPermissionsError,
  PreconditionFailedError,
} from "../errors.js";
import type {
  IssueApiKeyInput,
  ListApiKeysInput,
  RevokeApiKeyInput,
  ValidateApiKeyInput,
  ApiKeyOutput,
  ApiKeyCreatedOutput,
  ApiKeyListOutput,
  ValidateApiKeyOutput,
} from "./api-key.dto.js";

/** Subset of the repository API this service needs. */
export interface ApiKeyRepo {
  findById(id: string): Promise<Result<ApiKey>>;
  findByPrefix(prefix: string): Promise<Result<ApiKey>>;
  list(
    filters: { organizationId?: string; userId?: string; revoked?: boolean },
    page: { limit?: number; cursor?: string },
  ): Promise<Page<ApiKey>>;
  create(data: IssueApiKeyInput, secret: string): Promise<Result<ApiKey>>;
  revoke(id: string): Promise<Result<ApiKey>>;
  markUsed(id: string): Promise<Result<ApiKey>>;
  delete(id: string): Promise<Result<void>>;
}

/** Injected dependencies for ApiKeyService. */
export interface ApiKeyServiceDeps {
  readonly apiKeyRepo: ApiKeyRepo;
  readonly logger: Logger;
}

/** Length of the prefix extracted from a raw key for fast look-up. */
const RAW_KEY_PREFIX_LEN = 8;

/** Generate a cryptographically random API key string. */
function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  // Node 18+ provides globalThis.crypto; fall back to the crypto module.
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomFillSync } = require("crypto") as { randomFillSync: (b: Uint8Array) => void };
    randomFillSync(bytes);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Application service for managing REST API keys. */
export class ApiKeyService {
  private readonly repo: ApiKeyRepo;
  private readonly logger: Logger;

  constructor(deps: ApiKeyServiceDeps) {
    this.repo = deps.apiKeyRepo;
    this.logger = deps.logger;
  }

  /**
   * Issue a new API key for the given org/user combination.
   * The plaintext secret is returned exactly once in the response.
   */
  async issueApiKey(
    ctx: ServiceContext,
    input: IssueApiKeyInput,
  ): Promise<Result<ApiKeyCreatedOutput, AppError>> {
    const { principal } = ctx;

    // Callers may only issue keys for their own org unless they are admin/system.
    const isPrivileged =
      principal.roles.includes("admin") || principal.roles.includes("system");
    if (!isPrivileged && principal.orgId !== input.organizationId) {
      return err(new InsufficientPermissionsError("issue:api_key"));
    }

    const secret = generateRawKey();
    const createResult = await this.repo.create(input, secret);
    if (isErr(createResult)) return err(createResult.error as AppError);

    const keyRecord = createResult.value;

    this.logger.info("api_key.issued", {
      traceId: ctx.traceId,
      keyId: keyRecord.id,
      orgId: input.organizationId,
    });

    return ok({ ...keyRecord, secret });
  }

  /** Retrieve metadata for a single API key by its opaque ID. */
  async getApiKey(
    ctx: ServiceContext,
    keyId: string,
  ): Promise<Result<ApiKeyOutput, AppError>> {
    const result = await this.repo.findById(keyId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("ApiKey", keyId));
    }

    const key = result.value;
    if (!this.canAccess(ctx, key)) {
      return err(new InsufficientPermissionsError("read:api_key"));
    }

    return ok(key);
  }

  /** List API keys, optionally scoped to an org or user. */
  async listApiKeys(
    ctx: ServiceContext,
    input: ListApiKeysInput,
  ): Promise<Result<ApiKeyListOutput, AppError>> {
    const { principal } = ctx;
    const isPrivileged =
      principal.roles.includes("admin") || principal.roles.includes("system");

    // Non-privileged callers must scope to their own org.
    if (!isPrivileged) {
      if (
        input.organizationId === undefined ||
        input.organizationId !== principal.orgId
      ) {
        return err(new InsufficientPermissionsError("list:api_key"));
      }
    }

    const page = await this.repo.list(
      {
        organizationId: input.organizationId,
        userId: input.userId,
        revoked: false,
      },
      { limit: input.limit, cursor: input.cursor },
    );

    return ok({
      items: [...page.items],
      nextCursor: page.nextCursor ?? null,
      total: page.items.length,
    });
  }

  /**
   * Revoke an existing API key by its ID.
   * Callers may only revoke keys belonging to their own org unless privileged.
   */
  async revokeApiKey(
    ctx: ServiceContext,
    input: RevokeApiKeyInput,
  ): Promise<Result<ApiKeyOutput, AppError>> {
    const existing = await this.repo.findById(input.keyId);
    if (isErr(existing)) {
      return err(new ResourceNotFoundError("ApiKey", input.keyId));
    }

    const key = existing.value;
    if (!this.canAccess(ctx, key)) {
      return err(new InsufficientPermissionsError("revoke:api_key"));
    }

    if (key.revokedAt !== null) {
      return err(new PreconditionFailedError(`ApiKey '${input.keyId}' is already revoked.`));
    }

    const revokeResult = await this.repo.revoke(input.keyId);
    if (isErr(revokeResult)) return err(revokeResult.error as AppError);

    this.logger.info("api_key.revoked", { traceId: ctx.traceId, keyId: input.keyId });
    return ok(revokeResult.value);
  }

  /**
   * Validate a raw API key string presented at the authentication boundary.
   * Returns the key record if valid and active; invalid/expired/revoked keys
   * return { valid: false, apiKey: null }.
   */
  async validateApiKey(
    _ctx: ServiceContext,
    input: ValidateApiKeyInput,
  ): Promise<Result<ValidateApiKeyOutput, AppError>> {
    const prefix = input.rawKey.slice(0, RAW_KEY_PREFIX_LEN);
    const lookupResult = await this.repo.findByPrefix(prefix);

    if (isErr(lookupResult)) {
      return ok({ valid: false, apiKey: null });
    }

    const key = lookupResult.value;

    // Check revocation.
    if (key.revokedAt !== null) {
      return ok({ valid: false, apiKey: null });
    }

    // Check expiry.
    if (key.expiresAt !== null && new Date(key.expiresAt) < new Date()) {
      return ok({ valid: false, apiKey: null });
    }

    // Constant-time hash comparison.
    const incomingHash = sha256Hex(input.rawKey);
    if (incomingHash !== key.hashedKey) {
      return ok({ valid: false, apiKey: null });
    }

    // Record the last-used timestamp (best-effort; ignore failure).
    void this.repo.markUsed(key.id);

    return ok({ valid: true, apiKey: key });
  }

  /** Check whether the current principal may access a key record. */
  private canAccess(ctx: ServiceContext, key: ApiKey): boolean {
    const { principal } = ctx;
    if (principal.roles.includes("admin") || principal.roles.includes("system")) {
      return true;
    }
    return principal.orgId === key.organizationId;
  }
}
