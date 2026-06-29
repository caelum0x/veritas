// In-memory implementation of WalletRepository backed by MemoryStore.

import { ok, err, epochToIso } from "@veritas/core";
import type { Result, Page, PageRequest } from "@veritas/core";
import type { NotFoundError, ConflictError } from "@veritas/core";
import type { Wallet, CreateWallet } from "@veritas/contracts";
import { MemoryStore } from "./memory-store.js";
import { RepositoryNotFoundError, RepositoryConflictError } from "../errors.js";
import { paginateArray } from "../pagination.js";
import {
  type WalletRow,
  rowToWallet,
  createDtoToRow,
  mergeRow,
} from "../mappers/wallet.mapper.js";
import type { WalletRepository, WalletFilters } from "../repositories/wallet.repository.js";

export class WalletMemoryRepository implements WalletRepository {
  private readonly store = new MemoryStore<WalletRow>();

  async findById(id: string): Promise<Result<Wallet, NotFoundError>> {
    const row = this.store.get(id);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Wallet", id));
    }
    return ok(rowToWallet(row));
  }

  async findByAddress(address: string): Promise<Result<Wallet, NotFoundError>> {
    const row = this.store.all().find((r) => r.address === address);
    if (row === undefined) {
      return err(new RepositoryNotFoundError("Wallet", address));
    }
    return ok(rowToWallet(row));
  }

  async list(filters: WalletFilters, page: PageRequest): Promise<Page<Wallet>> {
    let rows = this.store.all();

    if (filters.organizationId !== undefined) {
      rows = rows.filter((r) => r.organizationId === filters.organizationId);
    }
    if (filters.agentId !== undefined) {
      rows = rows.filter((r) => r.agentId === filters.agentId);
    }
    if (filters.isCustodial !== undefined) {
      rows = rows.filter((r) => r.isCustodial === filters.isCustodial);
    }

    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const domainItems = rows.map(rowToWallet);
    return paginateArray(domainItems, page);
  }

  async create(data: CreateWallet): Promise<Result<Wallet, ConflictError>> {
    const existing = this.store.all().find((r) => r.address === data.address);
    if (existing !== undefined) {
      return err(
        new RepositoryConflictError("Wallet", `address ${data.address} already exists`),
      );
    }

    const now = epochToIso(Date.now());
    const row = createDtoToRow(data, now);
    const stored = this.store.set(row);
    return ok(rowToWallet(stored));
  }

  async update(
    id: string,
    data: Partial<CreateWallet>,
  ): Promise<Result<Wallet, NotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new RepositoryNotFoundError("Wallet", id));
    }

    const now = epochToIso(Date.now());
    const updated = mergeRow(existing, data, now);
    const stored = this.store.set(updated);
    return ok(rowToWallet(stored));
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    if (!this.store.has(id)) {
      return err(new RepositoryNotFoundError("Wallet", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
