// Provision a REST API key for an organization using the ApiKeyService.

import { ApiKeyService, makeServiceContext } from "@veritas/services";
import type { ServiceContext, Principal } from "@veritas/services";
import { noopLogger, newId, epochToIso, isErr } from "@veritas/core";
import type { Result, Page, Logger } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { ApiKey } from "@veritas/contracts";
import type { IssueApiKeyInput } from "@veritas/services";

/** Repo interface matching what ApiKeyService requires (inlined to avoid deep-path imports). */
interface ApiKeyRepo {
  findById(id: string): Promise<Result<ApiKey, AppError>>;
  findByPrefix(prefix: string): Promise<Result<ApiKey, AppError>>;
  list(
    filters: { organizationId?: string; userId?: string; revoked?: boolean },
    page: { limit?: number; cursor?: string },
  ): Promise<Page<ApiKey>>;
  create(data: IssueApiKeyInput, secret: string): Promise<Result<ApiKey, AppError>>;
  revoke(id: string): Promise<Result<ApiKey, AppError>>;
  markUsed(id: string): Promise<Result<ApiKey, AppError>>;
  delete(id: string): Promise<Result<void, AppError>>;
}

/** Minimal in-memory ApiKeyRepo for the example. */
class InMemoryApiKeyRepo implements ApiKeyRepo {
  private readonly store = new Map<string, ApiKey>();
  private readonly byPrefix = new Map<string, ApiKey>();

  async findById(id: string): Promise<Result<ApiKey, AppError>> {
    const record = this.store.get(id);
    if (!record) return { ok: false, error: new Error(`ApiKey ${id} not found`) as never };
    return { ok: true, value: record };
  }

  async findByPrefix(prefix: string): Promise<Result<ApiKey, AppError>> {
    const record = this.byPrefix.get(prefix);
    if (!record) return { ok: false, error: new Error(`ApiKey prefix ${prefix} not found`) as never };
    return { ok: true, value: record };
  }

  async list(
    _filters: { organizationId?: string; userId?: string; revoked?: boolean },
    page: { limit?: number; cursor?: string },
  ): Promise<Page<ApiKey>> {
    const items = Array.from(this.store.values()).slice(0, page.limit ?? 20);
    return { items, nextCursor: null, hasMore: false };
  }

  async create(data: IssueApiKeyInput, secret: string): Promise<Result<ApiKey, AppError>> {
    const id = newId("key");
    const now = epochToIso(Date.now());
    const prefix = secret.slice(0, 8);
    const record: ApiKey = {
      id: id as ApiKey["id"],
      organizationId: data.organizationId as ApiKey["organizationId"],
      userId: (data.userId ?? null) as ApiKey["userId"],
      name: data.name,
      prefix,
      hashedKey: `hashed_${secret}`,
      scopes: data.scopes ?? ["verify:read", "verify:write"],
      lastUsedAt: null,
      expiresAt: data.expiresAt ?? null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, record);
    this.byPrefix.set(prefix, record);
    return { ok: true, value: record };
  }

  async revoke(id: string): Promise<Result<ApiKey, AppError>> {
    const record = this.store.get(id);
    if (!record) return { ok: false, error: new Error(`ApiKey ${id} not found`) as never };
    const revoked: ApiKey = { ...record, revokedAt: epochToIso(Date.now()) };
    this.store.set(id, revoked);
    return { ok: true, value: revoked };
  }

  async markUsed(id: string): Promise<Result<ApiKey, AppError>> {
    const record = this.store.get(id);
    if (!record) return { ok: false, error: new Error(`ApiKey ${id} not found`) as never };
    const updated: ApiKey = { ...record, lastUsedAt: epochToIso(Date.now()) };
    this.store.set(id, updated);
    return { ok: true, value: updated };
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    this.store.delete(id);
    return { ok: true, value: undefined };
  }
}

async function main(): Promise<void> {
  const logger: Logger = noopLogger;
  const repo = new InMemoryApiKeyRepo();
  const service = new ApiKeyService({ apiKeyRepo: repo, logger });

  const orgId = newId("org");
  const systemUserId = newId("user");

  const principal: Principal = {
    userId: systemUserId,
    orgId,
    roles: ["admin"],
    apiKeyId: undefined,
  };

  const callerCtx: ServiceContext = makeServiceContext(
    principal,
    `trace-${newId("trc")}`,
    newId("req"),
    epochToIso(Date.now()),
  );

  const input: IssueApiKeyInput = {
    organizationId: orgId as ApiKey["organizationId"],
    userId: null,
    name: "example-key",
    scopes: ["verify:read", "verify:write"],
    expiresAt: null,
  };

  const result = await service.issueApiKey(callerCtx, input);

  if (isErr(result)) {
    process.stderr.write(`Failed to issue API key: ${result.error.message}\n`);
    process.exit(1);
  }

  const { secret, ...metadata } = result.value;

  process.stdout.write("API key created successfully.\n");
  process.stdout.write(`Key ID:   ${metadata.id}\n`);
  process.stdout.write(`Name:     ${metadata.name}\n`);
  process.stdout.write(`Prefix:   ${metadata.prefix}\n`);
  process.stdout.write(`Scopes:   ${metadata.scopes.join(", ")}\n`);
  process.stdout.write(`Secret:   ${secret}\n`);
  process.stdout.write("(Store the secret safely — it will not be shown again.)\n");

  const listResult = await service.listApiKeys(callerCtx, { organizationId: orgId as ApiKey["organizationId"] });
  if (!isErr(listResult)) {
    process.stdout.write(`\nOrg now has ${listResult.value.total} API key(s).\n`);
  }
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
