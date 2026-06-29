// Branded identifier types and prefixed nanoid-based generators.

import { nanoid } from "nanoid";
import type { Brand } from "./brand.js";

/** A prefixed, branded identifier (e.g. "claim_V1StGXR8..."). */
export type Id<P extends string> = Brand<string, `Id:${P}`>;

const DEFAULT_SIZE = 21;

/** Generate a new prefixed id, e.g. newId("claim") => "claim_...". */
export function newId<P extends string>(prefix: P, size = DEFAULT_SIZE): Id<P> {
  return `${prefix}_${nanoid(size)}` as Id<P>;
}

/** Validate that a value carries the expected prefix. */
export function isId<P extends string>(value: string, prefix: P): value is Id<P> {
  return value.startsWith(`${prefix}_`) && value.length > prefix.length + 1;
}

/** Coerce a string into a branded Id, throwing if the prefix mismatches. */
export function asId<P extends string>(value: string, prefix: P): Id<P> {
  if (!isId(value, prefix)) {
    throw new Error(`Invalid id for prefix "${prefix}": ${value}`);
  }
  return value;
}

/** Strip the prefix, returning the raw nanoid portion. */
export function idSuffix(value: string): string {
  const idx = value.indexOf("_");
  return idx === -1 ? value : value.slice(idx + 1);
}

// Domain-specific id aliases and factories used across Veritas packages.
export type ClaimId = Id<"claim">;
export type SourceId = Id<"source">;
export type VerificationId = Id<"vrf">;
export type OrderId = Id<"order">;
export type JobId = Id<"job">;
export type UserId = Id<"user">;
export type EventId = Id<"evt">;

export const newClaimId = (): ClaimId => newId("claim");
export const newSourceId = (): SourceId => newId("source");
export const newVerificationId = (): VerificationId => newId("vrf");
export const newOrderId = (): OrderId => newId("order");
export const newJobId = (): JobId => newId("job");
export const newUserId = (): UserId => newId("user");
export const newEventId = (): EventId => newId("evt");
