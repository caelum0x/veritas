// otpauth URI builder for provisioning TOTP/HOTP authenticator QR codes (RFC 6238 / Key URI Format).

import type { OtpAuthUriParams } from "./types.js";

/**
 * Encodes a component value for use in an otpauth URI label or parameter.
 * Spaces are encoded as %20 (not +) per the Key URI Format spec.
 */
function encodeOtpComponent(value: string): string {
  return encodeURIComponent(value).replace(/\+/g, "%20");
}

/**
 * Builds an otpauth:// URI from the given parameters.
 * The URI can be embedded in a QR code for authenticator apps.
 *
 * Format: otpauth://TYPE/LABEL?PARAMETERS
 * Spec: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function buildOtpAuthUri(params: OtpAuthUriParams): string {
  const { type, label, secret, issuer, algorithm, digits } = params;

  // Label is "issuer:account" when issuer is provided
  const encodedLabel = `${encodeOtpComponent(issuer)}:${encodeOtpComponent(label)}`;

  const searchParams = new URLSearchParams();
  searchParams.set("secret", secret);
  searchParams.set("issuer", issuer);
  searchParams.set("algorithm", algorithm ?? "SHA1");
  searchParams.set("digits", String(digits ?? 6));

  if (type === "totp") {
    searchParams.set("period", String(params.period ?? 30));
  } else {
    searchParams.set("counter", String(params.counter ?? 0));
  }

  return `otpauth://${type}/${encodedLabel}?${searchParams.toString()}`;
}

/**
 * Parses an otpauth URI back into its component parameters.
 * Returns null when the URI is malformed or missing required fields.
 */
export function parseOtpAuthUri(uri: string): OtpAuthUriParams | null {
  try {
    const url = new URL(uri);

    if (url.protocol !== "otpauth:") return null;

    const type = url.hostname as "totp" | "hotp";
    if (type !== "totp" && type !== "hotp") return null;

    // Pathname is /LABEL — strip leading slash
    const rawLabel = decodeURIComponent(url.pathname.slice(1));
    // Label may be "issuer:account" or just "account"
    const colonIdx = rawLabel.indexOf(":");
    const label = colonIdx !== -1 ? rawLabel.slice(colonIdx + 1) : rawLabel;

    const secret = url.searchParams.get("secret");
    if (!secret) return null;

    const issuer =
      url.searchParams.get("issuer") ??
      (colonIdx !== -1 ? rawLabel.slice(0, colonIdx) : "");

    const rawAlgorithm = url.searchParams.get("algorithm") ?? "SHA1";
    const algorithm = (["SHA1", "SHA256", "SHA512"].includes(rawAlgorithm)
      ? rawAlgorithm
      : "SHA1") as "SHA1" | "SHA256" | "SHA512";

    const rawDigits = parseInt(url.searchParams.get("digits") ?? "6", 10);
    const digits = ([6, 7, 8].includes(rawDigits) ? rawDigits : 6) as 6 | 7 | 8;

    const base: OtpAuthUriParams = {
      type,
      label,
      secret,
      issuer,
      algorithm,
      digits,
    };

    if (type === "totp") {
      const period = parseInt(url.searchParams.get("period") ?? "30", 10);
      return { ...base, period: period > 0 ? period : 30 };
    }

    const counter = parseInt(url.searchParams.get("counter") ?? "0", 10);
    return { ...base, counter: counter >= 0 ? counter : 0 };
  } catch {
    return null;
  }
}

/**
 * Builds an otpauth URI suitable for a TOTP factor with common defaults.
 */
export function buildTotpUri(
  secret: string,
  label: string,
  issuer: string,
  options: { algorithm?: "SHA1" | "SHA256" | "SHA512"; digits?: 6 | 7 | 8; period?: number } = {}
): string {
  return buildOtpAuthUri({
    type: "totp",
    label,
    secret,
    issuer,
    algorithm: options.algorithm ?? "SHA1",
    digits: options.digits ?? 6,
    period: options.period ?? 30,
  });
}

/**
 * Builds an otpauth URI suitable for an HOTP factor.
 */
export function buildHotpUri(
  secret: string,
  label: string,
  issuer: string,
  counter: number,
  options: { algorithm?: "SHA1" | "SHA256" | "SHA512"; digits?: 6 | 7 | 8 } = {}
): string {
  return buildOtpAuthUri({
    type: "hotp",
    label,
    secret,
    issuer,
    algorithm: options.algorithm ?? "SHA1",
    digits: options.digits ?? 6,
    counter,
  });
}
