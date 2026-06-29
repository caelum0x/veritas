// Mapper between Session domain objects and persistence row representation.
import { newId, type IsoTimestamp, asIsoTimestamp } from "@veritas/core";
import type { Session } from "@veritas/contracts";
import type { CreateSessionInput } from "../repositories/session.repository.js";

/** Raw persistence row for a Session (stored as plain object). */
export interface SessionRow {
  readonly id: string;
  readonly userId: string;
  readonly hashedToken: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly lastActiveAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Map a persistence row to a Session domain object. */
export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id as Session["id"],
    userId: row.userId as Session["userId"],
    hashedToken: row.hashedToken,
    ip: row.ip,
    userAgent: row.userAgent,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    lastActiveAt: row.lastActiveAt,
    createdAt: asIsoTimestamp(row.createdAt),
    updatedAt: asIsoTimestamp(row.updatedAt),
  };
}

/** Map a Session domain object to a persistence row. */
export function sessionToRow(session: Session): SessionRow {
  return {
    id: session.id,
    userId: session.userId,
    hashedToken: session.hashedToken,
    ip: session.ip,
    userAgent: session.userAgent,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/** Create a new Session domain object from a CreateSessionInput DTO. */
export function createDtoToSession(dto: CreateSessionInput, now: IsoTimestamp): Session {
  const id = newId("ses") as Session["id"];
  return {
    id,
    userId: dto.userId as Session["userId"],
    hashedToken: dto.hashedToken,
    ip: dto.ip ?? null,
    userAgent: dto.userAgent ?? null,
    expiresAt: dto.expiresAt,
    revokedAt: null,
    lastActiveAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
