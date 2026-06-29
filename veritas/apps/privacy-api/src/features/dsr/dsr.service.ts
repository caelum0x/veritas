// DSR service: orchestrates DSR lifecycle via @veritas/gdpr store, identity verification, and compliance flows.

import { ok, err, isOk, type Result } from "@veritas/core";
import type { Clock } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import {
  type DsrRequest,
  type DsrStatus,
  type DsrWorkflowState,
  type DsrStore,
  type IdentityVerifierPort,
  IdentityVerificationService,
  DsrNotFoundError,
  DsrAlreadyCompletedError,
  IdentityVerificationFailedError,
  ErasureBlockedError,
} from "@veritas/gdpr";
import {
  runDsrFulfillmentFlow,
  runErasureFlow,
  type DataCollector,
  type DsrDelivery,
  type ErasureStore,
  type ErasureHoldChecker,
} from "@veritas/flows-compliance";
import type { CreateDsrBody, UpdateDsrStatusBody } from "./dsr.schema.js";

/** Dependency interface consumed by DsrService — satisfied by the app's container Deps. */
export interface DsrServiceDeps {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly dsrStore: DsrStore;
  readonly identityVerifier: IdentityVerifierPort;
}

function makeNoOpCollector(): DataCollector {
  return {
    async collectForSubject(_subjectId: string): Promise<Record<string, unknown>> {
      return {};
    },
  };
}

function makeNoOpDelivery(): DsrDelivery {
  return {
    async deliver(_dsrId: string, _email: string, _data: Record<string, unknown>): Promise<void> {
      // Production: deliver via secure data download portal
    },
  };
}

function makeNoOpErasureStore(): ErasureStore {
  return {
    async eraseBySubjectId(_subjectId: string, _categories: readonly string[]): Promise<{ erased: number; errors: string[] }> {
      return { erased: 0, errors: [] };
    },
  };
}

function makeNoOpHoldChecker(): ErasureHoldChecker {
  return {
    async isBlocked(_subjectId: string): Promise<{ blocked: boolean; reason?: string }> {
      return { blocked: false };
    },
  };
}

export class DsrService {
  private readonly identityVerificationService: IdentityVerificationService;

  constructor(private readonly deps: DsrServiceDeps) {
    this.identityVerificationService = new IdentityVerificationService(
      deps.identityVerifier,
      deps.clock,
    );
  }

  async createDsr(body: CreateDsrBody): Promise<Result<DsrRequest, Error>> {
    try {
      const dsr = await this.deps.dsrStore.createDsr({
        type: body.type,
        subject: body.subject,
        description: body.description,
        metadata: body.metadata,
      });
      this.deps.logger.info("DSR created", { dsrId: dsr.id, type: dsr.type });
      return ok(dsr);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getDsr(id: string): Promise<Result<DsrRequest, DsrNotFoundError | Error>> {
    return this.deps.dsrStore.getDsr(id);
  }

  async listDsrsBySubject(subjectId: string): Promise<readonly DsrRequest[]> {
    return this.deps.dsrStore.listDsrsBySubject(subjectId);
  }

  async updateDsrStatus(
    id: string,
    body: UpdateDsrStatusBody,
  ): Promise<Result<DsrRequest, DsrNotFoundError | DsrAlreadyCompletedError | Error>> {
    const result = await this.deps.dsrStore.updateDsrStatus(
      id,
      body.status as DsrStatus,
      body.rejectionReason ? { rejectionReason: body.rejectionReason } : undefined,
    );
    if (isOk(result)) {
      this.deps.logger.info("DSR status updated", { dsrId: id, status: body.status });
    }
    return result;
  }

  async initiateVerification(
    subjectEmail: string,
    method: string,
  ): Promise<Result<{ tokenId: string }, IdentityVerificationFailedError | Error>> {
    const subject = { id: subjectEmail, email: subjectEmail };
    const result = await this.identityVerificationService.initiateVerification(
      subject,
      method as Parameters<IdentityVerificationService["initiateVerification"]>[1],
    );
    if (!isOk(result)) return err(result.error);
    this.deps.logger.info("Identity verification initiated", { email: subjectEmail, method });
    return ok(result.value);
  }

  async fulfillDsr(
    tokenId: string,
    otp: string,
    createBody: CreateDsrBody,
  ): Promise<Result<{ dsrId: string; recordCount: number; deliveredAt: string }, Error>> {
    const result = await runDsrFulfillmentFlow(
      {
        store: this.deps.dsrStore,
        identityVerifier: this.deps.identityVerifier,
        collector: makeNoOpCollector(),
        delivery: makeNoOpDelivery(),
        clock: this.deps.clock,
        logger: this.deps.logger,
      },
      {
        createDsr: {
          type: createBody.type,
          subject: createBody.subject,
          description: createBody.description,
          metadata: createBody.metadata,
        },
        tokenId,
        otp,
      },
    );
    if (!isOk(result)) return err(result.error as Error);
    return ok({
      dsrId: result.value.dsr.id,
      recordCount: result.value.recordCount,
      deliveredAt: result.value.deliveredAt,
    });
  }

  async runErasure(
    dsrId: string,
    categories: readonly string[],
  ): Promise<Result<{ dsrId: string; erasedCount: number; completedAt: string }, ErasureBlockedError | Error>> {
    const result = await runErasureFlow(
      {
        dsrStore: this.deps.dsrStore,
        erasureStore: makeNoOpErasureStore(),
        holdChecker: makeNoOpHoldChecker(),
        clock: this.deps.clock,
        logger: this.deps.logger,
      },
      { dsrId, categories },
    );
    if (!isOk(result)) return err(result.error as Error);
    return ok({
      dsrId: result.value.dsr.id,
      erasedCount: result.value.erasedCount,
      completedAt: result.value.completedAt,
    });
  }

  async getWorkflowState(dsrId: string): Promise<DsrWorkflowState | undefined> {
    return this.deps.dsrStore.getWorkflowState(dsrId);
  }
}
