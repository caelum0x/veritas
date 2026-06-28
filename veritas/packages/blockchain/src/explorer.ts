// Basescan URL builders for transactions, addresses, and blocks

import type { Chain } from "./chain.js";
import type { EvmAddress } from "./address.js";
import { unbrand } from "@veritas/core";

export interface ExplorerUrls {
  readonly tx: (hash: string) => string;
  readonly address: (address: EvmAddress) => string;
  readonly block: (blockNumber: bigint | number) => string;
  readonly token: (tokenAddress: EvmAddress, walletAddress?: EvmAddress) => string;
}

export function buildExplorerUrls(chain: Chain): ExplorerUrls {
  const base = chain.blockExplorerUrl.replace(/\/$/, "");
  return {
    tx: (hash: string): string => `${base}/tx/${hash}`,
    address: (address: EvmAddress): string => `${base}/address/${unbrand(address)}`,
    block: (blockNumber: bigint | number): string => `${base}/block/${blockNumber.toString()}`,
    token: (tokenAddress: EvmAddress, walletAddress?: EvmAddress): string => {
      const tokenPath = `${base}/token/${unbrand(tokenAddress)}`;
      return walletAddress !== undefined
        ? `${tokenPath}?a=${unbrand(walletAddress)}`
        : tokenPath;
    },
  };
}

export function txUrl(chain: Chain, hash: string): string {
  return buildExplorerUrls(chain).tx(hash);
}

export function addressUrl(chain: Chain, address: EvmAddress): string {
  return buildExplorerUrls(chain).address(address);
}

export function blockUrl(chain: Chain, blockNumber: bigint | number): string {
  return buildExplorerUrls(chain).block(blockNumber);
}

export function tokenUrl(
  chain: Chain,
  tokenAddress: EvmAddress,
  walletAddress?: EvmAddress
): string {
  return buildExplorerUrls(chain).token(tokenAddress, walletAddress);
}
