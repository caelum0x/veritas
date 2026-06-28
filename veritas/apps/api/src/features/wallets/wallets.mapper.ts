// Maps domain Wallet entities to API response shapes for the wallets feature.
import type { Wallet } from "@veritas/contracts";

export interface WalletResponse {
  readonly id: string;
  readonly organizationId: string | null;
  readonly agentId: string | null;
  readonly chain: string;
  readonly address: string;
  readonly balance: { readonly amount: string; readonly currency: string };
  readonly isCustodial: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toWalletResponse(wallet: Wallet): WalletResponse {
  return {
    id: wallet.id,
    organizationId: wallet.organizationId,
    agentId: wallet.agentId,
    chain: wallet.chain,
    address: wallet.address,
    balance: {
      amount: wallet.balance.amount.toString(),
      currency: wallet.balance.currency,
    },
    isCustodial: wallet.isCustodial,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}
