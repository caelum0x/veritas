// SettlementRepository interface for on-chain USDC settlement records.
import type { Result } from "@veritas/core";
import type { Settlement, CreateSettlement, UpdateSettlement } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";
import type { Page } from "@veritas/core";

/** Repository interface for Settlement entities. */
export interface SettlementRepository extends BaseRepository<Settlement, CreateSettlement, UpdateSettlement> {
  /** Find the settlement for a specific order, if one exists. */
  findByOrderId(orderId: string): Promise<Result<Settlement>>;

  /** Find the settlement by its on-chain transaction hash. */
  findByTxHash(txHash: string): Promise<Result<Settlement>>;

  /** Find all settlements with a given status. */
  findByStatus(status: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>>>;

  /** Find all settlements for a given sender address. */
  findByFromAddress(fromAddress: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>>>;

  /** Find all settlements for a given recipient address. */
  findByToAddress(toAddress: string, options?: QueryOptions<Settlement>): Promise<Result<Page<Settlement>>>;
}
