// Wallet application service: use-cases for managing on-chain USDC wallets.
import { Result, AppError, ok, err, toPageRequest } from "@veritas/core";
import type { Page } from "@veritas/core";
import type { Wallet } from "@veritas/contracts";
import type { WalletRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { serviceCall } from "../result.js";
import { ResourceNotFoundError, DuplicateResourceError, ServiceValidationError } from "../errors.js";
import type {
  CreateWalletInput,
  UpdateWalletInput,
  ListWalletsInput,
} from "./wallet.dto.js";

/** Dependencies injected into WalletService. */
export interface WalletServiceDeps extends BaseServiceDeps {
  readonly walletRepository: WalletRepository;
}

/** Application service encapsulating wallet lifecycle use-cases. */
export class WalletService extends BaseService {
  private readonly wallets: WalletRepository;

  constructor(deps: WalletServiceDeps) {
    super(deps);
    this.wallets = deps.walletRepository;
  }

  /** Retrieve a wallet by its id. */
  async getById(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<Wallet, AppError>> {
    return serviceCall(async () => {
      const result = await this.wallets.findById(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Wallet", id);
      }
      this.log(ctx, "debug", "wallet.getById", { walletId: id });
      return result.value;
    });
  }

  /** Retrieve a wallet by its on-chain address. */
  async getByAddress(
    ctx: ServiceContext,
    address: string,
  ): Promise<Result<Wallet, AppError>> {
    return serviceCall(async () => {
      const result = await this.wallets.findByAddress(address);
      if (!result.ok) {
        throw new ResourceNotFoundError("Wallet", address);
      }
      this.log(ctx, "debug", "wallet.getByAddress", { address });
      return result.value;
    });
  }

  /** List wallets with optional filters and pagination. */
  async list(
    ctx: ServiceContext,
    input: ListWalletsInput,
  ): Promise<Result<Page<Wallet>, AppError>> {
    return serviceCall(async () => {
      const { organizationId, agentId, isCustodial, cursor, limit } = input;
      const page = toPageRequest({ cursor, limit });
      const results = await this.wallets.list(
        { organizationId, agentId, isCustodial },
        page,
      );
      this.log(ctx, "debug", "wallet.list", { count: results.items.length });
      return results;
    });
  }

  /** Register a new wallet. */
  async create(
    ctx: ServiceContext,
    input: CreateWalletInput,
  ): Promise<Result<Wallet, AppError>> {
    return serviceCall(async () => {
      if (!input.address || input.address.trim().length === 0) {
        throw new ServiceValidationError("Wallet address must not be blank.");
      }

      const existing = await this.wallets.findByAddress(input.address);
      if (existing.ok) {
        throw new DuplicateResourceError("Wallet", "address", input.address);
      }

      const result = await this.wallets.create({
        ...input,
        isCustodial: input.isCustodial ?? false,
      });

      if (!result.ok) {
        throw new DuplicateResourceError("Wallet", "address", input.address);
      }

      this.log(ctx, "info", "wallet.created", {
        walletId: result.value.id,
        address: result.value.address,
      });
      return result.value;
    });
  }

  /** Update mutable fields of an existing wallet. */
  async update(
    ctx: ServiceContext,
    id: string,
    input: UpdateWalletInput,
  ): Promise<Result<Wallet, AppError>> {
    return serviceCall(async () => {
      if (input.address !== undefined && input.address.trim().length === 0) {
        throw new ServiceValidationError("Wallet address must not be blank.");
      }

      const result = await this.wallets.update(id, input);
      if (!result.ok) {
        throw new ResourceNotFoundError("Wallet", id);
      }

      this.log(ctx, "info", "wallet.updated", { walletId: id });
      return result.value;
    });
  }

  /** Remove a wallet by id. */
  async delete(
    ctx: ServiceContext,
    id: string,
  ): Promise<Result<void, AppError>> {
    return serviceCall(async () => {
      const result = await this.wallets.delete(id);
      if (!result.ok) {
        throw new ResourceNotFoundError("Wallet", id);
      }
      this.log(ctx, "info", "wallet.deleted", { walletId: id });
    });
  }
}
