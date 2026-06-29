// Keys feature service — creates, lists, retrieves, and revokes portal API keys
import { ok, err, isErr, type Result, NotFoundError } from "@veritas/core";
import {
  type PortalService,
  type PortalApiKey,
  type PortalApiKeyWithSecret,
  type CreatePortalApiKey,
  createPortalApiKey,
  revokeApiKey,
} from "@veritas/developer-portal";
import type { Logger } from "@veritas/observability";
import type { Clock } from "@veritas/core";
import type { CreateKeyBody, ListKeysQuery } from "./keys.schema.js";

export interface KeysDeps {
  readonly portalService: PortalService;
  readonly logger: Logger;
  readonly clock: Clock;
}

export class KeysService {
  private readonly svc: PortalService;
  private readonly log: Logger;
  private readonly clock: Clock;
  private readonly store = new Map<string, PortalApiKey>();

  constructor(deps: KeysDeps) {
    this.svc = deps.portalService;
    this.log = deps.logger;
    this.clock = deps.clock;
  }

  async createKey(body: CreateKeyBody): Promise<Result<PortalApiKeyWithSecret>> {
    // Verify the app exists and is accessible before creating a key
    const appResult = await this.svc.getApp(body.appId);
    if (isErr(appResult)) {
      this.log.warn("KeysService.createKey: app not found", { appId: body.appId });
      return appResult;
    }

    const input: CreatePortalApiKey = {
      appId: body.appId,
      organizationId: body.organizationId,
      name: body.name,
      environment: body.environment,
      scopes: body.scopes,
      expiresAt: body.expiresAt,
      metadata: body.metadata,
    };

    const now = this.clock.nowIso();
    const keyWithSecret = createPortalApiKey(input, now);

    // Persist the key (without secret) in the in-memory store
    const { secret: _secret, ...keyRecord } = keyWithSecret;
    this.store.set(keyRecord.id, keyRecord);

    this.log.info("KeysService.createKey", { id: keyRecord.id, appId: body.appId, environment: body.environment });
    return ok(keyWithSecret);
  }

  async getKey(id: string): Promise<Result<PortalApiKey>> {
    const key = this.store.get(id);
    if (!key) {
      return err(new NotFoundError({ message: `API key ${id} not found` }));
    }
    return ok(key);
  }

  async listKeys(query: ListKeysQuery, callerAppId?: string): Promise<Result<PortalApiKey[]>> {
    const appId = query.appId ?? callerAppId;
    if (!appId) {
      return err(new NotFoundError({ message: "appId is required to list keys" }));
    }

    // Verify app access
    const appResult = await this.svc.getApp(appId);
    if (isErr(appResult)) {
      this.log.warn("KeysService.listKeys: app not found", { appId });
      return appResult;
    }

    let keys = [...this.store.values()].filter((k) => k.appId === appId);

    if (query.environment) {
      keys = keys.filter((k) => k.environment === query.environment);
    }
    if (query.status) {
      keys = keys.filter((k) => k.status === query.status);
    }

    return ok(keys);
  }

  async revokeKey(id: string): Promise<Result<PortalApiKey>> {
    const key = this.store.get(id);
    if (!key) {
      return err(new NotFoundError({ message: `API key ${id} not found` }));
    }
    const now = this.clock.nowIso();
    const revoked = revokeApiKey(key, now);
    this.store.set(id, revoked);
    this.log.info("KeysService.revokeKey", { id, appId: revoked.appId });
    return ok(revoked);
  }
}
