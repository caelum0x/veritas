// Base32 codec (RFC 4648) for TOTP/HOTP secret encoding and decoding.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PADDING = "=";

export function base32Encode(input: Uint8Array): string {
  const chars: string[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of input) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      chars.push(ALPHABET[(buffer >> bitsLeft) & 0x1f] as string);
    }
  }

  if (bitsLeft > 0) {
    chars.push(ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f] as string);
  }

  while (chars.length % 8 !== 0) {
    chars.push(PADDING);
  }

  return chars.join("");
}

export function base32Decode(input: string): Uint8Array {
  const sanitized = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of sanitized) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    buffer = (buffer << 5) | idx;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

export function isValidBase32(input: string): boolean {
  try {
    base32Decode(input);
    return true;
  } catch {
    return false;
  }
}
