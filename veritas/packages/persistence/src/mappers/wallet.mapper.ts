// Maps Wallet domain objects to/from persistence rows with clone-on-write semantics.

import type { Wallet, CreateWallet } from "@veritas/contracts";
import { newId } from "@veritas/core";

/** Persistence row shape for a Wallet. */
export interface WalletRow {
  readonly id: string;
  readonly organizationId: string | null;
  readonly agentId: string | null;
  readonly chain: "base";
  readonly address: string;
  readonly balanceAmount: string;
  readonly balanceCurrency: string;
  readonly isCustodial: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Convert a persistence row to a Wallet domain object. */
export function rowToWallet(row: WalletRow): Wallet {
  return {
    id: row.id as Wallet["id"],
    organizationId: (row.organizationId ?? null) as Wallet["organizationId"],
    agentId: (row.agentId ?? null) as Wallet["agentId"],
    chain: row.chain,
    address: row.address,
    balance: {
      amount: row.balanceAmount,
      currency: row.balanceCurrency,
    } as Wallet["balance"],
    isCustodial: row.isCustodial,
    createdAt: row.createdAt as Wallet["createdAt"],
    updatedAt: row.updatedAt as Wallet["updatedAt"],
  };
}

/** Convert a CreateWallet DTO + generated fields into a persistence row. */
export function createDtoToRow(dto: CreateWallet, now: string): WalletRow {
  const id = newId("wlt");
  return {
    id,
    organizationId: dto.organizationId ?? null,
    agentId: dto.agentId ?? null,
    chain: "base",
    address: dto.address,
    balanceAmount: "0",
    balanceCurrency: "USDC",
    isCustodial: dto.isCustodial ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an existing row with a partial update DTO, returning a new row. */
export function mergeRow(
  existing: WalletRow,
  patch: Partial<CreateWallet>,
  now: string,
): WalletRow {
  return {
    ...existing,
    ...(patch.organizationId !== undefined
      ? { organizationId: patch.organizationId ?? null }
      : {}),
    ...(patch.agentId !== undefined ? { agentId: patch.agentId ?? null } : {}),
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.isCustodial !== undefined ? { isCustodial: patch.isCustodial } : {}),
    updatedAt: now,
  };
}

/** Apply a balance update (amount as string), returning a new row. */
export function updateBalance(
  existing: WalletRow,
  amount: string,
  now: string,
): WalletRow {
  return { ...existing, balanceAmount: amount, updatedAt: now };
}
