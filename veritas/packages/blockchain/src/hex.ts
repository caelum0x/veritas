// Hex encoding/decoding helpers for EVM data

export type HexString = `0x${string}`;

export function isHexString(value: unknown): value is HexString {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
}

export function toHex(value: bigint | number | Uint8Array): HexString {
  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }
  const n = BigInt(value);
  const hex = n.toString(16);
  return `0x${hex}` as HexString;
}

export function hexToBigInt(hex: HexString): bigint {
  return BigInt(hex);
}

export function hexToNumber(hex: HexString): number {
  return Number(BigInt(hex));
}

export function bytesToHex(bytes: Uint8Array): HexString {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}` as HexString;
}

export function hexToBytes(hex: HexString): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const padded = clean.length % 2 === 0 ? clean : `0${clean}`;
  const bytes = new Uint8Array(padded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function padHex(hex: HexString, byteLength: number): HexString {
  const clean = hex.replace(/^0x/, "");
  return `0x${clean.padStart(byteLength * 2, "0")}` as HexString;
}

export function concatHex(parts: HexString[]): HexString {
  return `0x${parts.map((h) => h.replace(/^0x/, "")).join("")}` as HexString;
}

export function stripHexPrefix(hex: HexString): string {
  return hex.replace(/^0x/, "");
}

export function ensureHexPrefix(value: string): HexString {
  return value.startsWith("0x") ? (value as HexString) : (`0x${value}` as HexString);
}
