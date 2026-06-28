// Rate key derivation — builds namespaced cache keys from request context.
import { sha256Hex } from "@veritas/core";

export interface KeyContext {
  readonly identifier: string;    // user id, API key id, IP, etc.
  readonly route?: string;        // e.g. "POST /claims"
  readonly planId?: string;       // plan-specific limits
  readonly windowLabel?: string;  // optional bucket label
}

export type KeyStrategy = "global" | "per-route" | "per-plan" | "per-route-plan";

/** Derive a stable, opaque rate-limit key from context. */
export function deriveKey(ctx: KeyContext, strategy: KeyStrategy = "per-route"): string {
  const parts: string[] = [ctx.identifier];

  if (strategy === "per-route" || strategy === "per-route-plan") {
    parts.push(ctx.route ?? "global");
  }
  if (strategy === "per-plan" || strategy === "per-route-plan") {
    parts.push(ctx.planId ?? "default");
  }
  if (ctx.windowLabel != null) {
    parts.push(ctx.windowLabel);
  }

  return sha256Hex(parts.join("|")).slice(0, 32);
}

/** Build a key scoped to a specific algorithm namespace. */
export function scopedKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/** Derive key for an IP address (masks last octet for IPv4). */
export function ipKey(ip: string, route?: string): string {
  const masked = ip.replace(/\.\d+$/, ".0");
  return deriveKey({ identifier: masked, route }, route != null ? "per-route" : "global");
}
