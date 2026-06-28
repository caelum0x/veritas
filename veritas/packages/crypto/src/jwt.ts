// Minimal JWS/JWT sign and verify using Ed25519 (EdDSA) or HMAC-SHA256
import { createHmac, createVerify, createSign } from "node:crypto";
import { encode as b64encode, decode as b64decode, encodeString, decodeToString } from "./base64url.js";
import { constantTimeEqual } from "./constant-time.js";
import { InvalidJwtError, JwtExpiredError } from "./errors.js";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export type JwtAlgorithm = "EdDSA" | "HS256";

export interface JwtHeader {
  alg: JwtAlgorithm;
  typ: "JWT";
  kid?: string;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface SignOptions {
  algorithm: JwtAlgorithm;
  /** Key: raw Ed25519 private key bytes (EdDSA) or HMAC secret (HS256) */
  key: Uint8Array;
  kid?: string;
  expiresInSeconds?: number;
  issuer?: string;
  subject?: string;
  audience?: string | string[];
}

export interface VerifyOptions {
  algorithm: JwtAlgorithm;
  /** Key: raw Ed25519 public key bytes (EdDSA) or HMAC secret (HS256) */
  key: Uint8Array;
  issuer?: string;
  audience?: string | string[];
  clockToleranceSeconds?: number;
}

function buildHeader(alg: JwtAlgorithm, kid?: string): JwtHeader {
  return kid ? { alg, typ: "JWT", kid } : { alg, typ: "JWT" };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function signHs256(signingInput: string, secret: Uint8Array): Uint8Array {
  const mac = createHmac("sha256", secret).update(signingInput).digest();
  return new Uint8Array(mac);
}

function verifyHs256(signingInput: string, signature: Uint8Array, secret: Uint8Array): boolean {
  const expected = signHs256(signingInput, secret);
  return constantTimeEqual(expected, signature);
}

function signEdDsa(signingInput: string, privateKeyDer: Uint8Array): Uint8Array {
  const signer = createSign("ed25519");
  signer.update(signingInput);
  const sig = signer.sign({ key: Buffer.from(privateKeyDer), format: "der", type: "pkcs8" });
  return new Uint8Array(sig);
}

function verifyEdDsa(signingInput: string, signature: Uint8Array, publicKeyDer: Uint8Array): boolean {
  try {
    const verifier = createVerify("ed25519");
    verifier.update(signingInput);
    return verifier.verify(
      { key: Buffer.from(publicKeyDer), format: "der", type: "spki" },
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export function signJwt(payload: JwtPayload, options: SignOptions): Result<string, InvalidJwtError> {
  try {
    const now = nowSeconds();
    const claims: JwtPayload = {
      ...payload,
      iat: now,
      ...(options.issuer !== undefined ? { iss: options.issuer } : {}),
      ...(options.subject !== undefined ? { sub: options.subject } : {}),
      ...(options.audience !== undefined ? { aud: options.audience } : {}),
      ...(options.expiresInSeconds !== undefined ? { exp: now + options.expiresInSeconds } : {}),
    };

    const header = buildHeader(options.algorithm, options.kid);
    const headerB64 = encodeString(JSON.stringify(header));
    const payloadB64 = encodeString(JSON.stringify(claims));
    const signingInput = `${headerB64}.${payloadB64}`;

    let signature: Uint8Array;
    if (options.algorithm === "HS256") {
      signature = signHs256(signingInput, options.key);
    } else {
      signature = signEdDsa(signingInput, options.key);
    }

    return ok(`${signingInput}.${b64encode(signature)}`);
  } catch (cause) {
    return err(new InvalidJwtError("Failed to sign JWT", cause));
  }
}

export function verifyJwt(
  token: string,
  options: VerifyOptions,
): Result<{ header: JwtHeader; payload: JwtPayload }, InvalidJwtError | JwtExpiredError> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return err(new InvalidJwtError("Malformed JWT: expected 3 parts"));
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(decodeToString(headerB64)) as JwtHeader;
    payload = JSON.parse(decodeToString(payloadB64)) as JwtPayload;
  } catch (cause) {
    return err(new InvalidJwtError("Failed to decode JWT parts", cause));
  }

  if (header.alg !== options.algorithm) {
    return err(new InvalidJwtError(`Algorithm mismatch: expected ${options.algorithm}, got ${header.alg}`));
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = b64decode(signatureB64);

  let valid: boolean;
  if (options.algorithm === "HS256") {
    valid = verifyHs256(signingInput, signature, options.key);
  } else {
    valid = verifyEdDsa(signingInput, signature, options.key);
  }

  if (!valid) {
    return err(new InvalidJwtError("Invalid JWT signature"));
  }

  const tolerance = options.clockToleranceSeconds ?? 0;
  const now = nowSeconds();

  if (typeof payload.exp === "number" && now > payload.exp + tolerance) {
    return err(new JwtExpiredError());
  }

  if (typeof payload.nbf === "number" && now < payload.nbf - tolerance) {
    return err(new InvalidJwtError("JWT not yet valid (nbf)"));
  }

  if (options.issuer !== undefined && payload.iss !== options.issuer) {
    return err(new InvalidJwtError(`Issuer mismatch: expected ${options.issuer}`));
  }

  if (options.audience !== undefined) {
    const expected = Array.isArray(options.audience) ? options.audience : [options.audience];
    const actual = Array.isArray(payload.aud) ? payload.aud : typeof payload.aud === "string" ? [payload.aud] : [];
    const hasAud = expected.some((e) => actual.includes(e));
    if (!hasAud) {
      return err(new InvalidJwtError("Audience mismatch"));
    }
  }

  return ok({ header, payload });
}

export function decodeJwtUnsafe(token: string): Result<{ header: JwtHeader; payload: JwtPayload }, InvalidJwtError> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return err(new InvalidJwtError("Malformed JWT: expected 3 parts"));
  }
  try {
    const header = JSON.parse(decodeToString(parts[0] as string)) as JwtHeader;
    const payload = JSON.parse(decodeToString(parts[1] as string)) as JwtPayload;
    return ok({ header, payload });
  } catch (cause) {
    return err(new InvalidJwtError("Failed to decode JWT parts", cause));
  }
}
