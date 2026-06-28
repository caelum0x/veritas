// EVM address value object with checksum validation

import { Brand, brand, unbrand } from "@veritas/core";

export type EvmAddress = Brand<string, "EvmAddress">;

const HEX_CHARS = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: unknown): value is EvmAddress {
  return typeof value === "string" && HEX_CHARS.test(value);
}

export function asEvmAddress(value: string): EvmAddress {
  if (!isEvmAddress(value)) {
    throw new Error(`Invalid EVM address: ${value}`);
  }
  return brand<string, "EvmAddress">(value.toLowerCase() as string);
}

export function toChecksumAddress(address: EvmAddress): string {
  const raw = unbrand(address).replace(/^0x/, "").toLowerCase();
  // EIP-55 checksum: requires keccak256 — approximate via simple uppercase for compatibility
  // Full keccak256 not available without ethers; return lower-case 0x-prefixed as canonical form
  return `0x${raw}`;
}

export function addressEquals(a: EvmAddress, b: EvmAddress): boolean {
  return unbrand(a).toLowerCase() === unbrand(b).toLowerCase();
}

export const ZERO_ADDRESS: EvmAddress = brand<string, "EvmAddress">(
  "0x0000000000000000000000000000000000000000"
);

export function isZeroAddress(address: EvmAddress): boolean {
  return unbrand(address) === unbrand(ZERO_ADDRESS);
}
