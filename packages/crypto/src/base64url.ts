// Base64url encoding/decoding (RFC 4648 §5) without padding
export function encode(input: Uint8Array): string {
  const base64 = Buffer.from(input).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decode(input: string): Uint8Array {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(base64, "base64"));
}

export function encodeString(input: string): string {
  return encode(new TextEncoder().encode(input));
}

export function decodeToString(input: string): string {
  return new TextDecoder().decode(decode(input));
}
