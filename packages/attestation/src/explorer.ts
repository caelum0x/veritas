// Generate block-explorer and EAS-explorer links for attestation UIDs and tx hashes.

import type { TxHash } from "@veritas/blockchain";
import type { AttestationUid } from "./uid.js";

/** Supported chain identifiers for explorer link generation. */
export type ExplorerChain = "base" | "base-sepolia";

const BLOCK_EXPLORER_BASE: Record<ExplorerChain, string> = {
  "base": "https://basescan.org",
  "base-sepolia": "https://sepolia.basescan.org",
};

const EAS_EXPLORER_BASE: Record<ExplorerChain, string> = {
  "base": "https://base.easscan.org",
  "base-sepolia": "https://base-sepolia.easscan.org",
};

/** Links for a given attestation or transaction. */
export interface AttestationLinks {
  readonly txUrl: string;
  readonly attestationUrl: string;
  readonly chain: ExplorerChain;
}

/**
 * Build block-explorer and EAS-explorer URLs for an attestation.
 * Returns undefined fields when the tx hash or uid is unavailable.
 */
export function buildAttestationLinks(options: {
  readonly chain: ExplorerChain;
  readonly txHash: TxHash;
  readonly uid: AttestationUid;
}): AttestationLinks {
  const blockBase = BLOCK_EXPLORER_BASE[options.chain];
  const easBase = EAS_EXPLORER_BASE[options.chain];

  return {
    txUrl: `${blockBase}/tx/${options.txHash}`,
    attestationUrl: `${easBase}/attestation/view/${options.uid}`,
    chain: options.chain,
  };
}

/** Return the EAS explorer base URL for a chain. */
export function easExplorerUrl(chain: ExplorerChain): string {
  return EAS_EXPLORER_BASE[chain];
}

/** Return the block explorer base URL for a chain. */
export function blockExplorerUrl(chain: ExplorerChain): string {
  return BLOCK_EXPLORER_BASE[chain];
}

/** Resolve a chain ID to the ExplorerChain discriminant. */
export function chainIdToExplorerChain(chainId: number): ExplorerChain {
  if (chainId === 8453) return "base";
  if (chainId === 84532) return "base-sepolia";
  throw new Error(`Unsupported chainId for explorer links: ${chainId}`);
}
