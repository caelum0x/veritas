// Wallets feature service: delegates to WalletService from @veritas/services via deps.
import { isErr, epochToIso, newId, type Result, type Page } from "@veritas/core";
import type { Wallet } from "@veritas/contracts";
import type { WalletService } from "@veritas/services";
import { makeServiceContext, type Principal } from "@veritas/services";
import type { Logger } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import type {
  ListWalletsQuery,
  CreateWalletBody,
  UpdateWalletBody,
} from "./wallets.schema.js";

export interface WalletsDeps {
  readonly walletService: WalletService;
  readonly logger: Logger;
}

function buildCtx(req: AuthenticatedRequest) {
  const principal: Principal = {
    userId: req.userId ?? "anonymous",
    orgId: req.orgId ?? undefined,
    roles: req.scopes ?? [],
    apiKeyId: req.apiKeyId ?? undefined,
  };
  const requestId = (req as unknown as { requestId?: string }).requestId ?? newId("req");
  return makeServiceContext(principal, requestId, requestId, epochToIso(Date.now()));
}

export class WalletsFeatureService {
  private readonly svc: WalletService;
  private readonly logger: Logger;

  constructor(deps: WalletsDeps) {
    this.svc = deps.walletService;
    this.logger = deps.logger;
  }

  async list(req: AuthenticatedRequest, query: ListWalletsQuery): Promise<Result<Page<Wallet>>> {
    const ctx = buildCtx(req);
    return this.svc.list(ctx, {
      organizationId: query.organizationId,
      agentId: query.agentId,
      isCustodial: query.isCustodial,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getById(req: AuthenticatedRequest, id: string): Promise<Result<Wallet>> {
    const ctx = buildCtx(req);
    return this.svc.getById(ctx, id);
  }

  async create(req: AuthenticatedRequest, body: CreateWalletBody): Promise<Result<Wallet>> {
    const ctx = buildCtx(req);
    return this.svc.create(ctx, {
      organizationId: body.organizationId ?? null,
      agentId: body.agentId ?? null,
      address: body.address,
      isCustodial: body.isCustodial,
    });
  }

  async update(
    req: AuthenticatedRequest,
    id: string,
    body: UpdateWalletBody,
  ): Promise<Result<Wallet>> {
    const ctx = buildCtx(req);
    return this.svc.update(ctx, id, body);
  }

  async delete(req: AuthenticatedRequest, id: string): Promise<Result<void>> {
    const ctx = buildCtx(req);
    return this.svc.delete(ctx, id);
  }
}
