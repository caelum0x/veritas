// Shared primitive types and branded IDs used across plugin-sdk modules.
import { z } from "zod";
import { type Brand, brand } from "@veritas/core";

// ---------------------------------------------------------------------------
// Branded plugin identifiers
// ---------------------------------------------------------------------------

/** Opaque string that uniquely identifies a plugin by its reverse-domain id. */
export type PluginId = Brand<string, "PluginId">;

/** Coerce a raw string into a PluginId (no runtime validation beyond non-empty). */
export function asPluginId(raw: string): PluginId {
  if (raw.trim().length === 0) throw new Error("PluginId must be non-empty");
  return brand<string, "PluginId">(raw) as PluginId;
}

/** Semantic version string, e.g. "1.2.3". */
export type SemVer = Brand<string, "SemVer">;

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function asSemVer(raw: string): SemVer {
  if (!SEMVER_RE.test(raw)) throw new Error(`Invalid SemVer: ${raw}`);
  return brand<string, "SemVer">(raw) as SemVer;
}

// ---------------------------------------------------------------------------
// Capability names
// ---------------------------------------------------------------------------

/**
 * Well-known capability tokens plugins may declare in their manifest.
 * The host checks these against its own capability registry before activation.
 */
export const KNOWN_CAPABILITIES = [
  "web:fetch",
  "llm:inference",
  "crypto:sign",
  "storage:read",
  "storage:write",
  "event:publish",
] as const;

export type KnownCapability = (typeof KNOWN_CAPABILITIES)[number];

/** Any capability token — known or extension-defined. */
export type CapabilityToken = KnownCapability | (string & {});

// ---------------------------------------------------------------------------
// Zod helpers
// ---------------------------------------------------------------------------

export const pluginIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9._-]+$/, "PluginId must be lowercase alphanumeric with ., _, -")
  .transform((v) => asPluginId(v));

export const semVerSchema = z
  .string()
  .regex(SEMVER_RE, "Must be semver x.y.z")
  .transform((v) => asSemVer(v));

export const capabilityTokenSchema = z.string().min(1);

// ---------------------------------------------------------------------------
// Plugin status
// ---------------------------------------------------------------------------

export type PluginStatus = "unloaded" | "initialized" | "active" | "disposed" | "error";

// ---------------------------------------------------------------------------
// Metadata record (caller-supplied key-value pairs)
// ---------------------------------------------------------------------------

export type MetaRecord = Readonly<Record<string, string>>;
