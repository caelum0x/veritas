// Port interface for submitting attestation transactions to an EVM chain.

import type { Result } from "@veritas/core";
import type { HexString, EvmAddress, TxHash } from "@veritas/blockchain";

/** Parameters needed to submit a raw attestation transaction. */
export interface AttestTxParams {
  readonly to: EvmAddress;
  readonly data: HexString;
  readonly value?: bigint;
}

/** Result returned after a transaction is mined. */
export interface TxReceipt {
  readonly txHash: TxHash;
  readonly blockNumber: bigint;
  readonly blockHash: HexString;
  readonly status: "success" | "reverted";
  readonly gasUsed: bigint;
}

/** Port for broadcasting and awaiting EVM transactions. */
export interface OnchainPort {
  /** Submit a transaction and wait for its receipt. */
  sendTransaction(params: AttestTxParams): Promise<Result<TxReceipt>>;

  /** Return the address of the signer/wallet used by this port. */
  signerAddress(): Promise<EvmAddress>;
}
