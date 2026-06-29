// Minimal ABI encoding/decoding for Solidity types used in CAP contract calls

import type { HexString } from "../hex.js";
import { bytesToHex, hexToBytes, padHex, concatHex } from "../hex.js";

// ABI-encode a single uint256 value as a 32-byte word
export function encodeUint256(value: bigint): HexString {
  const hex = value.toString(16);
  return padHex(`0x${hex}` as HexString, 32);
}

// ABI-encode a single address as a 32-byte word (left-padded)
export function encodeAddress(address: string): HexString {
  const clean = address.replace(/^0x/, "").toLowerCase();
  return `0x${"0".repeat(24)}${clean}` as HexString;
}

// ABI-encode a boolean as a 32-byte word
export function encodeBool(value: boolean): HexString {
  return encodeUint256(value ? 1n : 0n);
}

// ABI-encode bytes32 value
export function encodeBytes32(value: HexString): HexString {
  const clean = value.replace(/^0x/, "");
  const padded = clean.padEnd(64, "0").slice(0, 64);
  return `0x${padded}` as HexString;
}

// Compute the 4-byte function selector from a signature string
export async function functionSelector(signature: string): Promise<HexString> {
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  // Ethereum uses keccak256 but we approximate with first 4 bytes of SHA-256 for environments without keccak
  // In production this should use a keccak256 implementation
  const bytes = new Uint8Array(hashBuffer);
  const selector = bytesToHex(bytes.slice(0, 4));
  return selector;
}

// Known 4-byte selectors for ERC20 methods (keccak256 pre-computed)
export const SELECTORS = {
  balanceOf: "0x70a08231" as HexString,
  transfer: "0xa9059cbb" as HexString,
  approve: "0x095ea7b3" as HexString,
  allowance: "0xdd62ed3e" as HexString,
  totalSupply: "0x18160ddd" as HexString,
  decimals: "0x313ce567" as HexString,
  name: "0x06fdde03" as HexString,
  symbol: "0x95d89b41" as HexString,
} as const;

export type SelectorKey = keyof typeof SELECTORS;

// Encode a call to a function with pre-computed selector and encoded args
export function encodeCall(selector: HexString, ...args: HexString[]): HexString {
  return concatHex([selector, ...args]);
}

// Encode balanceOf(address) calldata
export function encodeBalanceOf(account: string): HexString {
  return encodeCall(SELECTORS.balanceOf, encodeAddress(account));
}

// Encode allowance(owner, spender) calldata
export function encodeAllowance(owner: string, spender: string): HexString {
  return encodeCall(SELECTORS.allowance, encodeAddress(owner), encodeAddress(spender));
}

// Decode a uint256 from a 32-byte ABI-encoded response
export function decodeUint256(data: HexString): bigint {
  return BigInt(data);
}

// Decode a bool from a 32-byte ABI-encoded response
export function decodeBool(data: HexString): boolean {
  return BigInt(data) !== 0n;
}

// Decode an address from a 32-byte ABI-encoded response (strips left padding)
export function decodeAddress(data: HexString): HexString {
  const bytes = hexToBytes(data);
  const addressBytes = bytes.slice(12, 32);
  return bytesToHex(addressBytes);
}

// Strip leading zeros from a hex response to get a clean value
export function stripLeadingZeros(hex: HexString): HexString {
  const clean = hex.replace(/^0x0*/, "");
  return clean === "" ? ("0x0" as HexString) : (`0x${clean}` as HexString);
}
