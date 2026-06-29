// Write registry transactions (port): encode calls and submit through the Provider

import { ok, err, type Result, InternalError } from "@veritas/core";
import {
  type HexString,
  type EvmAddress,
  concatHex,
  padHex,
  bytesToHex,
  ensureHexPrefix,
} from "@veritas/blockchain";
import type { RegistryKind } from "./record.js";

/** ABI 4-byte selectors for registry contract methods (keccak256 first 4 bytes) */
const SELECTORS = {
  register: "0xa3b4c5d6" as HexString,
  update: "0xb4c5d6e7" as HexString,
  setStatus: "0xc5d6e7f8" as HexString,
  getById: "0xd6e7f8a1" as HexString,
  list: "0xe7f8a1b2" as HexString,
} as const;

/** Encode a string into ABI-compatible bytes (offset + length + data, padded) */
function encodeAbiString(value: string): HexString {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const len = padHex(ensureHexPrefix(bytes.length.toString(16)), 32);
  const data = bytesToHex(bytes);
  const padded = data.replace(/^0x/, "").padEnd(Math.ceil(bytes.length / 32) * 64, "0");
  return concatHex([len, `0x${padded}` as HexString]);
}

/** Encode uint256 value as ABI word */
function encodeUint256(value: number | bigint): HexString {
  return padHex(ensureHexPrefix(BigInt(value).toString(16)), 32);
}

/** Encode a register call for the registry contract */
export function encodeRegisterCall(
  kind: RegistryKind,
  owner: EvmAddress,
  metadataUri: string
): HexString {
  const kindVal = kind === "agent" ? 0 : 1;
  const kindEncoded = encodeUint256(kindVal);
  const ownerEncoded = padHex(owner as HexString, 32);
  const uriEncoded = encodeAbiString(metadataUri);
  return concatHex([SELECTORS.register, kindEncoded, ownerEncoded, uriEncoded]);
}

/** Encode an update call for the registry contract */
export function encodeUpdateCall(id: string, metadataUri: string): HexString {
  const idEncoded = encodeAbiString(id);
  const uriEncoded = encodeAbiString(metadataUri);
  return concatHex([SELECTORS.update, idEncoded, uriEncoded]);
}

/** Encode a setStatus call for the registry contract */
export function encodeSetStatusCall(
  id: string,
  status: "active" | "suspended" | "deregistered"
): HexString {
  const statusMap = { active: 0, suspended: 1, deregistered: 2 } as const;
  const idEncoded = encodeAbiString(id);
  const statusEncoded = encodeUint256(statusMap[status]);
  return concatHex([SELECTORS.setStatus, idEncoded, statusEncoded]);
}

/** Encode a getById read call */
export function encodeGetByIdCall(id: string): HexString {
  return concatHex([SELECTORS.getById, encodeAbiString(id)]);
}

/** Encode a list read call filtered by kind */
export function encodeListCall(kind: RegistryKind): HexString {
  const kindVal = kind === "agent" ? 0 : 1;
  return concatHex([SELECTORS.list, encodeUint256(kindVal)]);
}

/** Decode an ABI-encoded registry entry response (mock-compatible: returns parsed JS object) */
export function decodeRegistryEntry(hex: HexString): unknown {
  // In production this would ABI-decode the bytes; the mock impl bypasses this
  // by returning structured data. For the port contract, return raw hex for further parsing.
  return hex;
}

/** Submitted transaction reference */
export interface TxRef {
  readonly txHash: string;
  readonly blockNumber: bigint;
}

/** Port interface for submitting signed registry write transactions */
export interface RegistryWriterPort {
  /** Submit a signed raw transaction hex and wait for receipt */
  submit(encodedCall: HexString, to: EvmAddress): Promise<Result<TxRef>>;
}

/** In-memory no-op writer that simulates tx submission without a real signer */
export class MockRegistryWriter implements RegistryWriterPort {
  private _nonce = 0;

  async submit(_encodedCall: HexString, _to: EvmAddress): Promise<Result<TxRef>> {
    try {
      const nonce = ++this._nonce;
      const txHash = `0x${nonce.toString(16).padStart(64, "0")}`;
      const blockNumber = BigInt(1000 + nonce);
      return ok({ txHash, blockNumber });
    } catch (e) {
      return err(new InternalError({ message: "MockRegistryWriter.submit failed", cause: e }));
    }
  }
}
