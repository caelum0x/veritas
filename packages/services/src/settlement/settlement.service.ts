// Settlement application service: submit, confirm, fail, and query on-chain USDC settlements.
import {
  ok,
  err,
  isErr,
  isOk,
  epochToIso,
  type Result,
  type AppError,
  type Page,
  toPageRequest,
} from "@veritas/core";
import type { SettlementRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import {
  ResourceNotFoundError,
  PreconditionFailedError,
  DuplicateResourceError,
} from "../errors.js";
import { serviceCall } from "../result.js";
import {
  type CreateSettlementInput,
  type UpdateSettlementInput,
  type ListSettlementsInput,
  type ConfirmSettlementInput,
  type FailSettlementInput,
  type SettlementOutput,
  toSettlementOutput,
} from "./settlement.dto.js";

/** Dependencies required by SettlementService. */
export interface SettlementServiceDeps extends BaseServiceDeps {
  readonly settlementRepo: SettlementRepository;
}

/** Application service for managing on-chain USDC settlement records. */
export class SettlementService extends BaseService {
  private readonly settlementRepo: SettlementRepository;

  constructor(deps: SettlementServiceDeps) {
    super(deps);
    this.settlementRepo = deps.settlementRepo;
  }

  /** Submit a new settlement record for an order. */
  async submit(
    ctx: ServiceContext,
    input: CreateSettlementInput,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const existing = await this.settlementRepo.findByOrderId(input.orderId);
      if (isOk(existing)) {
        throw new DuplicateResourceError("Settlement", "orderId", input.orderId);
      }

      const byHash = await this.settlementRepo.findByTxHash(input.txHash);
      if (isOk(byHash)) {
        throw new DuplicateResourceError("Settlement", "txHash", input.txHash);
      }

      const result = await this.settlementRepo.create(input);
      if (isErr(result)) throw result.error;

      this.log(ctx, "info", "Settlement submitted", {
        settlementId: result.value.id,
        orderId: input.orderId,
        txHash: input.txHash,
      });
      return toSettlementOutput(result.value);
    });
  }

  /** Retrieve a single settlement by its id. */
  async getById(
    ctx: ServiceContext,
    settlementId: string,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.settlementRepo.findById(settlementId);
      if (isErr(result)) throw new ResourceNotFoundError("Settlement", settlementId);
      return toSettlementOutput(result.value);
    });
  }

  /** Retrieve the settlement associated with a specific order. */
  async getByOrderId(
    ctx: ServiceContext,
    orderId: string,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.settlementRepo.findByOrderId(orderId);
      if (isErr(result)) throw new ResourceNotFoundError("Settlement", orderId);
      return toSettlementOutput(result.value);
    });
  }

  /** List settlements with optional filters and cursor-based pagination. */
  async list(
    ctx: ServiceContext,
    input: ListSettlementsInput,
  ): Promise<Result<Page<SettlementOutput>, AppError>> {
    return serviceCall(async () => {
      const pageReq = toPageRequest({ limit: input.limit, cursor: input.cursor });

      if (input.orderId !== undefined) {
        const r = await this.settlementRepo.findByOrderId(input.orderId);
        if (isErr(r)) return { items: [], nextCursor: null, hasMore: false, total: 0 };
        return { items: [toSettlementOutput(r.value)], nextCursor: null, hasMore: false, total: 1 };
      }

      if (input.fromAddress !== undefined) {
        const r = await this.settlementRepo.findByFromAddress(input.fromAddress, { page: pageReq });
        if (isErr(r)) throw r.error;
        return { ...r.value, items: r.value.items.map(toSettlementOutput) } as Page<SettlementOutput>;
      }

      if (input.toAddress !== undefined) {
        const r = await this.settlementRepo.findByToAddress(input.toAddress, { page: pageReq });
        if (isErr(r)) throw r.error;
        return { ...r.value, items: r.value.items.map(toSettlementOutput) } as Page<SettlementOutput>;
      }

      if (input.status !== undefined) {
        const r = await this.settlementRepo.findByStatus(input.status, { page: pageReq });
        if (isErr(r)) throw r.error;
        return { ...r.value, items: r.value.items.map(toSettlementOutput) } as Page<SettlementOutput>;
      }

      const r = await this.settlementRepo.list({ page: pageReq });
      if (isErr(r)) throw r.error;
      return { ...r.value, items: r.value.items.map(toSettlementOutput) } as Page<SettlementOutput>;
    });
  }

  /** Confirm an on-chain settlement with its block number and timestamp. */
  async confirm(
    ctx: ServiceContext,
    input: ConfirmSettlementInput,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const fetched = await this.settlementRepo.findById(input.settlementId);
      if (isErr(fetched)) throw new ResourceNotFoundError("Settlement", input.settlementId);

      const current = fetched.value;
      if (current.status !== "SUBMITTED") {
        throw new PreconditionFailedError(
          `Settlement cannot be confirmed in status '${current.status}'.`,
        );
      }

      const result = await this.settlementRepo.update(input.settlementId, {
        status: "CONFIRMED",
        blockNumber: input.blockNumber,
        confirmedAt: input.confirmedAt,
      });
      if (isErr(result)) throw result.error;

      this.log(ctx, "info", "Settlement confirmed", {
        settlementId: input.settlementId,
        blockNumber: input.blockNumber,
      });
      return toSettlementOutput(result.value);
    });
  }

  /** Mark a settlement as failed. */
  async fail(
    ctx: ServiceContext,
    input: FailSettlementInput,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const fetched = await this.settlementRepo.findById(input.settlementId);
      if (isErr(fetched)) throw new ResourceNotFoundError("Settlement", input.settlementId);

      const current = fetched.value;
      if (current.status !== "SUBMITTED") {
        throw new PreconditionFailedError(
          `Settlement cannot be failed in status '${current.status}'.`,
        );
      }

      const result = await this.settlementRepo.update(input.settlementId, {
        status: "FAILED",
      });
      if (isErr(result)) throw result.error;

      this.log(ctx, "warn", "Settlement failed", {
        settlementId: input.settlementId,
        reason: input.reason,
      });
      return toSettlementOutput(result.value);
    });
  }

  /** Apply an arbitrary update to a settlement record (admin use). */
  async update(
    ctx: ServiceContext,
    settlementId: string,
    input: UpdateSettlementInput,
  ): Promise<Result<SettlementOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.settlementRepo.update(settlementId, input);
      if (isErr(result)) throw new ResourceNotFoundError("Settlement", settlementId);
      this.log(ctx, "info", "Settlement updated", { settlementId });
      return toSettlementOutput(result.value);
    });
  }
}
