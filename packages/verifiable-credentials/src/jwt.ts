// VC-JWT encode/decode: wraps W3C Verifiable Credentials as compact JWTs per vc-jose-cose spec.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { VerifiableCredential } from "./credential.js";
import type { VerifiablePresentation } from "./presentation.js";

/** Registered JWT claims that overlap with VC fields (per W3C VC Data Model §6.3.1). */
export interface VcJwtPayload {
  readonly iss: string;
  readonly sub?: string;
  readonly aud?: string | readonly string[];
  readonly iat: number;
  readonly exp?: number;
  readonly jti?: string;
  readonly nbf?: number;
  /** Embedded VC claim. */
  readonly vc?: unknown;
  /** Embedded VP claim. */
  readonly vp?: unknown;
  readonly [key: string]: unknown;
}

export class VcJwtError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "VcJwtError";
  }
}

const vcJwtPayloadSchema = z.object({
  iss: z.string(),
  sub: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  iat: z.number(),
  exp: z.number().optional(),
  jti: z.string().optional(),
  nbf: z.number().optional(),
  vc: z.unknown().optional(),
  vp: z.unknown().optional(),
});

function b64urlDecode(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64url").toString("utf8");
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

/** Decode a VC-JWT without verifying the signature. Returns header + payload. */
export function decodeVcJwt(token: string): Result<{ header: Record<string, unknown>; payload: VcJwtPayload }, VcJwtError> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return err(new VcJwtError("Malformed JWT: expected 3 dot-separated parts"));
  }
  try {
    const header = JSON.parse(b64urlDecode(parts[0] as string)) as Record<string, unknown>;
    const rawPayload = JSON.parse(b64urlDecode(parts[1] as string));
    const parsed = vcJwtPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return err(new VcJwtError("Invalid VC-JWT payload: " + parsed.error.message));
    }
    return ok({ header, payload: parsed.data as VcJwtPayload });
  } catch (cause) {
    return err(new VcJwtError("Failed to decode VC-JWT", cause));
  }
}

/** Encode a VerifiableCredential as a VC-JWT payload (unsigned — caller must sign). */
export function encodeVcPayload(vc: VerifiableCredential): VcJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: typeof vc.issuer === "string" ? vc.issuer : vc.issuer.id,
    sub: (() => { const cs = Array.isArray(vc.credentialSubject) ? vc.credentialSubject[0] : vc.credentialSubject; return typeof (cs as { id?: unknown }).id === "string" ? (cs as { id: string }).id : undefined; })(),
    jti: vc.id,
    iat: now,
    vc: vc,
  };
}

/** Encode a VerifiablePresentation as a VC-JWT payload (unsigned — caller must sign). */
export function encodeVpPayload(vp: VerifiablePresentation): VcJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: vp.holder ?? "unknown",
    jti: vp.id,
    iat: now,
    vp: vp,
  };
}

/** Build the base64url-encoded header+payload signing input for a VC-JWT. */
export function buildVcJwtSigningInput(payload: VcJwtPayload, alg: string, kid?: string): string {
  const header: Record<string, unknown> = { alg, typ: "JWT" };
  if (kid !== undefined) header["kid"] = kid;
  const headerB64 = b64urlEncode(JSON.stringify(header));
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  return `${headerB64}.${payloadB64}`;
}

/** Assemble a complete JWT from signing input and raw signature bytes. */
export function assembleVcJwt(signingInput: string, signatureBytes: Uint8Array): string {
  const sigB64 = Buffer.from(signatureBytes).toString("base64url");
  return `${signingInput}.${sigB64}`;
}
