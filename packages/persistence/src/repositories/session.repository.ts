// SessionRepository interface for authenticated user sessions.
import type { Result } from "@veritas/core";
import type { Session, CreateSession } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";
import type { Page } from "@veritas/core";

/** Extended create DTO that includes the pre-hashed token for secure storage. */
export interface CreateSessionInput extends CreateSession {
  readonly hashedToken: string;
}

/** Repository interface for Session entities. */
export interface SessionRepository extends BaseRepository<Session, CreateSessionInput, Record<string, never>> {
  /** Find all active (non-revoked, non-expired) sessions for a given user. */
  findActiveByUserId(userId: string, options?: QueryOptions<Session>): Promise<Result<Page<Session>>>;

  /** Find all sessions for a given user, including revoked ones. */
  findByUserId(userId: string, options?: QueryOptions<Session>): Promise<Result<Page<Session>>>;

  /** Find a session by its hashed token value. */
  findByHashedToken(hashedToken: string): Promise<Result<Session>>;

  /** Revoke a session by setting its revokedAt timestamp. */
  revoke(id: string, revokedAt: string): Promise<Result<Session>>;

  /** Update the lastActiveAt timestamp for a session. */
  touch(id: string, lastActiveAt: string): Promise<Result<Session>>;
}
