// Revocation status list implementing W3C Status List 2021 with bitstring encoding.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { newId } from "@veritas/core";

export class StatusListError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "StatusListError";
  }
}

/** Minimum 131072 status entries per W3C Status List 2021 §5. */
export const MIN_STATUS_LIST_SIZE = 131_072;

export interface StatusList {
  readonly id: string;
  readonly issuer: string;
  readonly statusPurpose: "revocation" | "suspension";
  readonly encodedList: string;
  readonly size: number;
  readonly issuanceDate: string;
}

export interface StatusListEntry {
  readonly id: string;
  readonly type: "StatusList2021Entry";
  readonly statusPurpose: "revocation" | "suspension";
  readonly statusListIndex: string;
  readonly statusListCredential: string;
}

const statusListSchema = z.object({
  id: z.string(),
  issuer: z.string(),
  statusPurpose: z.enum(["revocation", "suspension"]),
  encodedList: z.string(),
  size: z.number().int().positive(),
  issuanceDate: z.string(),
});

/** Allocate a new empty status list of the given size (defaults to minimum). */
export function createStatusList(
  issuer: string,
  statusPurpose: "revocation" | "suspension" = "revocation",
  size: number = MIN_STATUS_LIST_SIZE,
): StatusList {
  const bytes = Math.ceil(size / 8);
  const buf = Buffer.alloc(bytes, 0);
  const encodedList = buf.toString("base64url");
  return Object.freeze({
    id: `urn:statuslist:${newId("sl")}`,
    issuer,
    statusPurpose,
    encodedList,
    size,
    issuanceDate: new Date().toISOString(),
  });
}

function decodeList(encodedList: string, size: number): Buffer {
  const buf = Buffer.from(encodedList, "base64url");
  const expected = Math.ceil(size / 8);
  if (buf.length < expected) {
    const padded = Buffer.alloc(expected, 0);
    buf.copy(padded);
    return padded;
  }
  return buf;
}

/** Check whether the credential at the given index is revoked/suspended. */
export function isStatusSet(list: StatusList, index: number): Result<boolean, StatusListError> {
  if (index < 0 || index >= list.size) {
    return err(new StatusListError(`Index ${index} out of range [0, ${list.size})`));
  }
  const buf = decodeList(list.encodedList, list.size);
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);
  const byte = buf[byteIndex] ?? 0;
  return ok((byte & (1 << bitIndex)) !== 0);
}

/** Return a new StatusList with the bit at index set (revoke/suspend). */
export function setStatus(list: StatusList, index: number, value: boolean): Result<StatusList, StatusListError> {
  if (index < 0 || index >= list.size) {
    return err(new StatusListError(`Index ${index} out of range [0, ${list.size})`));
  }
  const buf = decodeList(list.encodedList, list.size);
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);
  const byte = buf[byteIndex] ?? 0;
  buf[byteIndex] = value ? byte | (1 << bitIndex) : byte & ~(1 << bitIndex);
  return ok(
    Object.freeze({
      ...list,
      encodedList: buf.toString("base64url"),
      issuanceDate: new Date().toISOString(),
    }),
  );
}

/** Parse and validate a raw status list object. */
export function parseStatusList(raw: unknown): Result<StatusList, StatusListError> {
  const result = statusListSchema.safeParse(raw);
  if (!result.success) {
    return err(new StatusListError("Invalid status list: " + result.error.message));
  }
  return ok(Object.freeze(result.data) as StatusList);
}

/** Build a StatusListEntry to embed in a VerifiableCredential. */
export function makeStatusListEntry(
  statusListCredentialUrl: string,
  index: number,
  statusPurpose: "revocation" | "suspension" = "revocation",
): StatusListEntry {
  return Object.freeze({
    id: `${statusListCredentialUrl}#${index}`,
    type: "StatusList2021Entry",
    statusPurpose,
    statusListIndex: String(index),
    statusListCredential: statusListCredentialUrl,
  });
}
