// Wallet/account abstraction view — read-only account representation

import { type Result, ok, err, InternalError, type AppError } from "@veritas/core";
import type { EvmAddress } from "./address.js";
import type { Provider } from "./provider.js";
import { weiToEth, type Wei } from "./units.js";

export interface WalletView {
  readonly address: EvmAddress;
  readonly chainId: number;
}

export interface WalletBalance {
  readonly address: EvmAddress;
  readonly wei: Wei;
  readonly eth: number;
}

export async function getWalletBalance(
  provider: Provider,
  address: EvmAddress
): Promise<Result<WalletBalance, AppError>> {
  try {
    const balance = await provider.getBalance(address as string, "latest");
    return ok({
      address,
      wei: balance,
      eth: weiToEth(balance),
    });
  } catch (cause) {
    return err(
      new InternalError({
        message: `Failed to fetch balance for ${address}`,
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      })
    );
  }
}

export async function getChainId(
  provider: Provider
): Promise<Result<number, AppError>> {
  try {
    const chainId = await provider.getChainId();
    return ok(chainId);
  } catch (cause) {
    return err(
      new InternalError({
        message: "Failed to fetch chain ID",
        cause: cause instanceof Error ? cause : new Error(String(cause)),
      })
    );
  }
}

export async function createWalletView(
  provider: Provider,
  address: EvmAddress
): Promise<Result<WalletView, AppError>> {
  const chainIdResult = await getChainId(provider);
  if (!chainIdResult.ok) return err(chainIdResult.error);

  return ok({
    address,
    chainId: chainIdResult.value,
  });
}

export interface WalletSnapshot {
  readonly view: WalletView;
  readonly balance: WalletBalance;
}

export async function snapshotWallet(
  provider: Provider,
  address: EvmAddress
): Promise<Result<WalletSnapshot, AppError>> {
  const [viewResult, balanceResult] = await Promise.all([
    createWalletView(provider, address),
    getWalletBalance(provider, address),
  ]);

  if (!viewResult.ok) return err(viewResult.error);
  if (!balanceResult.ok) return err(balanceResult.error);

  return ok({ view: viewResult.value, balance: balanceResult.value });
}
