// Sessions service — issues, verifies, lists, and revokes sessions via @veritas/auth token primitives.

import { randomBytes } from "node:crypto";
import { ok, err, isOk, isErr, type Result, ValidationError, NotFoundError, UnauthorizedError, InternalError, ForbiddenError, type AppError } from "@veritas/core";
import { verifyToken, type SessionTokenPayload } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import type { TokenService } from "../../container.js";
import type { CreateSessionBody } from "./sessions.schema.js";
import type { SessionRecord, SessionTokenResponse } from "./sessions.mapper.js";
import { toSessionTokenResponse } from "./sessions.mapper.js";

// In-memory session store (Deps does not expose a session repository — managed here).
const sessionStore = new Map<string, SessionRecord>();

function newSessionId(): string {
  return `ses_${randomBytes(12).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface SessionsServiceDeps {
  readonly tokenService: TokenService;
  readonly logger: Logger;
  readonly tokenSecret: string;
  readonly tokenTtlSeconds: number;
}

export class SessionsService {
  private readonly tokenService: TokenService;
  private readonly logger: Logger;
  private readonly tokenSecret: string;
  private readonly tokenTtlSeconds: number;

  constructor(deps: SessionsServiceDeps) {
    this.tokenService = deps.tokenService;
    this.logger = deps.logger;
    this.tokenSecret = deps.tokenSecret;
    this.tokenTtlSeconds = deps.tokenTtlSeconds;
  }

  create(body: CreateSessionBody): Result<SessionTokenResponse, AppError> {
    const sessionId = newSessionId();
    const ttl = body.ttlSeconds ?? this.tokenTtlSeconds;
    const expiresAtEpoch = Math.floor(Date.now() / 1000) + ttl;
    const expiresAtIso = new Date(expiresAtEpoch * 1000).toISOString();
    const now = nowIso();

    const payload: Omit<SessionTokenPayload, "expiresAt"> = {
      userId: body.userId,
      organizationId: body.organizationId,
      sessionId,
    };

    const token = this.tokenService.issue(payload);

    const record: SessionRecord = {
      id: sessionId,
      userId: body.userId,
      organizationId: body.organizationId,
      ip: body.ip ?? null,
      userAgent: body.userAgent ?? null,
      expiresAt: expiresAtIso,
      createdAt: now,
      revokedAt: null,
      lastActiveAt: now,
    };

    sessionStore.set(sessionId, record);

    const fullPayload: SessionTokenPayload = { ...payload, expiresAt: expiresAtEpoch };
    return ok(toSessionTokenResponse(token, fullPayload));
  }

  verify(token: string): Result<SessionTokenPayload, AppError> {
    const result = verifyToken({ secret: this.tokenSecret, token });
    if (isErr(result)) {
      return err(new UnauthorizedError({ message: result.error.message }));
    }

    const session = sessionStore.get(result.value.sessionId);
    if (session?.revokedAt) {
      return err(new UnauthorizedError({ message: "Session has been revoked" }));
    }

    // Update lastActiveAt in-place via immutable replacement
    if (session) {
      sessionStore.set(session.id, { ...session, lastActiveAt: nowIso() });
    }

    return ok(result.value);
  }

  revoke(sessionId: string, requestingUserId: string): Result<void, AppError> {
    const session = sessionStore.get(sessionId);
    if (!session) {
      return err(new NotFoundError({ message: "Session not found" }));
    }
    if (session.userId !== requestingUserId) {
      return err(new ForbiddenError({ message: "Cannot revoke another user's session" }));
    }
    if (session.revokedAt) {
      return err(new ValidationError({ message: "Session is already revoked" }));
    }

    sessionStore.set(sessionId, { ...session, revokedAt: nowIso() });
    this.logger.info("Session revoked", { sessionId, userId: requestingUserId });
    return ok(undefined);
  }

  listByUser(userId: string): Result<SessionRecord[], AppError> {
    const sessions = [...sessionStore.values()].filter((s) => s.userId === userId);
    return ok(sessions);
  }

  revokeAllByUser(userId: string): Result<number, AppError> {
    let count = 0;
    const now = nowIso();
    for (const [id, session] of sessionStore) {
      if (session.userId === userId && !session.revokedAt) {
        sessionStore.set(id, { ...session, revokedAt: now });
        count++;
      }
    }
    this.logger.info("All sessions revoked for user", { userId, count });
    return ok(count);
  }
}
