// Chain config for Base mainnet and Base Sepolia testnet

export interface Chain {
  readonly id: number;
  readonly name: string;
  readonly rpcUrl: string;
  readonly blockExplorerUrl: string;
  readonly nativeCurrency: { readonly name: string; readonly symbol: string; readonly decimals: number };
}

export const BASE_MAINNET: Chain = {
  id: 8453,
  name: "Base",
  rpcUrl: "https://mainnet.base.org",
  blockExplorerUrl: "https://basescan.org",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

export const BASE_SEPOLIA: Chain = {
  id: 84532,
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorerUrl: "https://sepolia.basescan.org",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

export const SUPPORTED_CHAINS: readonly Chain[] = [BASE_MAINNET, BASE_SEPOLIA] as const;

export type ChainId = 8453 | 84532;

export function getChain(chainId: ChainId): Chain {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (chain === undefined) throw new Error(`Unsupported chainId: ${chainId}`);
  return chain;
}

export function isSupported(chainId: number): chainId is ChainId {
  return SUPPORTED_CHAINS.some((c) => c.id === chainId);
}
