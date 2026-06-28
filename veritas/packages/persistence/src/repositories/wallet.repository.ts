// WalletRepository interface: read/write access to persisted on-chain wallets.

import type { Result } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { PageRequest, Page } from "@veritas/core";
import type { Wallet, CreateWallet } from "@veritas/contracts";

/** Filter options for listing wallets. */
export interface WalletFilters {
  /** Optionally restrict to wallets for a specific organization. */
  readonly organizationId?: string;
  /** Optionally restrict to wallets for a specific agent. */
  readonly agentId?: string;
  /** Optionally restrict to custodial or non-custodial wallets. */
  readonly isCustodial?: boolean;
}

/** Repository abstraction for Wallet entities. */
export interface WalletRepository {
  /**
   * Find a wallet by its id.
   * Returns Err(NotFoundError) if no such wallet exists.
   */
  findById(id: string): Promise<Result<Wallet, NotFoundError>>;

  /**
   * Find a wallet by its on-chain address.
   * Returns Err(NotFoundError) if no wallet matches.
   */
  findByAddress(address: string): Promise<Result<Wallet, NotFoundError>>;

  /**
   * List wallets with optional filters and cursor-based pagination.
   */
  list(filters: WalletFilters, page: PageRequest): Promise<Page<Wallet>>;

  /**
   * Persist a new wallet derived from CreateWallet data.
   * Returns Err(ConflictError) if a wallet with the same address already exists.
   */
  create(data: CreateWallet): Promise<Result<Wallet, ConflictError>>;

  /**
   * Replace a stored wallet's mutable fields.
   * Returns Err(NotFoundError) if the wallet does not exist.
   */
  update(id: string, data: Partial<CreateWallet>): Promise<Result<Wallet, NotFoundError>>;

  /**
   * Remove a wallet by id.
   * Returns Err(NotFoundError) if the wallet does not exist.
   */
  delete(id: string): Promise<Result<void, NotFoundError>>;
}
