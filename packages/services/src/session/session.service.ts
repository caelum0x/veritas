// Session application service: create, validate, touch, revoke, and list sessions.
import {
  ok,
  err,
  isErr,
  isOk,
  sha256Hex,
  epochToIso,
  type Result,
  type AppError,
  type Page,
  toPageRequest,
} from "@veritas/core";
import type { Session } from "@veritas/contracts";
import type { SessionRepository } from "@veritas/persistence";
import { BaseService, type BaseServiceDeps } from "../base-service.js";
import type { ServiceContext } from "../service-context.js";
import { ResourceNotFoundError, ServiceValidationError } from "../errors.js";
import { serviceCall } from "../result.js";
import {
  type CreateSessionInput,
  type ValidateSessionInput,
  type ListSessionsInput,
  type RevokeSessionInput,
  type RevokeAllSessionsInput,
  type SessionOutput,
  toSessionOutput,
} from "./session.dto.js";

/** Dependencies required by SessionService. */
export interface SessionServiceDeps extends BaseServiceDeps {
  readonly sessionRepo: SessionRepository;
}

/** Application service for managing authenticated user sessions. */
export class SessionService extends BaseService {
  private readonly sessionRepo: SessionRepository;

  constructor(deps: SessionServiceDeps) {
    super(deps);
    this.sessionRepo = deps.sessionRepo;
  }

  /** Create a new session by hashing the raw token and persisting the record. */
  async create(
    ctx: ServiceContext,
    input: CreateSessionInput,
  ): Promise<Result<SessionOutput, AppError>> {
    return serviceCall(async () => {
      const { rawToken, ...rest } = input;
      const hashedToken = sha256Hex(rawToken);

      const existing = await this.sessionRepo.findByHashedToken(hashedToken);
      if (isOk(existing)) {
        throw new ServiceValidationError("A session with this token already exists.");
      }

      const result = await this.sessionRepo.create({ ...rest, hashedToken });
      if (isErr(result)) throw result.error;

      this.log(ctx, "info", "Session created", { sessionId: result.value.id });
      return toSessionOutput(result.value);
    });
  }

  /** Look up a session by its raw bearer token and update last-active timestamp. */
  async validate(
    ctx: ServiceContext,
    input: ValidateSessionInput,
  ): Promise<Result<SessionOutput, AppError>> {
    return serviceCall(async () => {
      const hashedToken = sha256Hex(input.rawToken);
      const result = await this.sessionRepo.findByHashedToken(hashedToken);
      if (isErr(result)) {
        throw new ResourceNotFoundError("Session", "<token>");
      }

      const session = result.value;
      if (session.revokedAt !== null) {
        throw new ServiceValidationError("Session has been revoked.");
      }

      const now = epochToIso(this.clock.now());
      if (new Date(session.expiresAt) <= new Date(now)) {
        throw new ServiceValidationError("Session has expired.");
      }

      const touched = await this.sessionRepo.touch(session.id, now);
      const live = isOk(touched) ? touched.value : session;
      return toSessionOutput(live);
    });
  }

  /** Retrieve a single session by its id. */
  async getById(
    ctx: ServiceContext,
    sessionId: string,
  ): Promise<Result<SessionOutput, AppError>> {
    return serviceCall(async () => {
      const result = await this.sessionRepo.findById(sessionId);
      if (isErr(result)) throw new ResourceNotFoundError("Session", sessionId);
      this.log(ctx, "debug", "Session fetched", { sessionId });
      return toSessionOutput(result.value);
    });
  }

  /** List sessions for a user with optional pagination. */
  async list(
    ctx: ServiceContext,
    input: ListSessionsInput,
  ): Promise<Result<Page<SessionOutput>, AppError>> {
    return serviceCall(async () => {
      const pageReq = toPageRequest({ limit: input.limit, cursor: input.cursor });
      const result = input.includeRevoked
        ? await this.sessionRepo.findByUserId(input.userId, { page: pageReq })
        : await this.sessionRepo.findActiveByUserId(input.userId, { page: pageReq });

      if (isErr(result)) throw result.error;

      return {
        ...result.value,
        items: result.value.items.map(toSessionOutput),
      } as Page<SessionOutput>;
    });
  }

  /** Revoke a single session by its id. */
  async revoke(
    ctx: ServiceContext,
    input: RevokeSessionInput,
  ): Promise<Result<SessionOutput, AppError>> {
    return serviceCall(async () => {
      const now = epochToIso(this.clock.now());
      const result = await this.sessionRepo.revoke(input.sessionId, now);
      if (isErr(result)) throw new ResourceNotFoundError("Session", input.sessionId);
      this.log(ctx, "info", "Session revoked", { sessionId: input.sessionId });
      return toSessionOutput(result.value);
    });
  }

  /** Revoke all sessions belonging to a user, with an optional exception. */
  async revokeAll(
    ctx: ServiceContext,
    input: RevokeAllSessionsInput,
  ): Promise<Result<number, AppError>> {
    return serviceCall(async () => {
      const allResult = await this.sessionRepo.findByUserId(input.userId);
      if (isErr(allResult)) throw allResult.error;

      const now = epochToIso(this.clock.now());
      let revokedCount = 0;

      for (const session of allResult.value.items) {
        if (session.revokedAt !== null) continue;
        if (input.exceptSessionId !== undefined && session.id === input.exceptSessionId) continue;

        const r = await this.sessionRepo.revoke(session.id, now);
        if (isOk(r)) revokedCount++;
      }

      this.log(ctx, "info", "Sessions revoked in bulk", {
        userId: input.userId,
        revokedCount,
      });
      return revokedCount;
    });
  }
}
