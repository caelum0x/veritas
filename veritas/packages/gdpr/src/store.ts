// In-memory DSR store: CRUD for requests, consent records, and workflow states.

import { type Result, ok, err } from "@veritas/core";
import { type Clock } from "@veritas/core";
import {
  type DsrRequest,
  type CreateDsrRequest,
  type DsrStatus,
  type ConsentRecord,
  type DsrWorkflowState,
  DsrRequestSchema,
} from "./types.js";
import { DsrNotFoundError, DsrAlreadyCompletedError } from "./errors.js";

const TERMINAL_STATUSES: ReadonlySet<DsrStatus> = new Set(["completed", "rejected", "withdrawn"]);

export interface DsrStore {
  createDsr(req: CreateDsrRequest): Promise<DsrRequest>;
  getDsr(id: string): Promise<Result<DsrRequest, DsrNotFoundError>>;
  listDsrsBySubject(subjectId: string): Promise<readonly DsrRequest[]>;
  updateDsrStatus(
    id: string,
    status: DsrStatus,
    extra?: Partial<Pick<DsrRequest, "rejectionReason" | "verifiedAt" | "completedAt" | "verificationMethod">>,
  ): Promise<Result<DsrRequest, DsrNotFoundError | DsrAlreadyCompletedError>>;

  saveConsent(record: ConsentRecord): Promise<void>;
  getConsent(id: string): Promise<ConsentRecord | undefined>;
  listConsentsBySubject(subjectId: string): Promise<readonly ConsentRecord[]>;

  saveWorkflowState(state: DsrWorkflowState): Promise<void>;
  getWorkflowState(dsrId: string): Promise<DsrWorkflowState | undefined>;
}

export class InMemoryDsrStore implements DsrStore {
  private readonly dsrs = new Map<string, DsrRequest>();
  private readonly consents = new Map<string, ConsentRecord>();
  private readonly workflows = new Map<string, DsrWorkflowState>();
  private counter = 0;

  constructor(private readonly clock: Clock) {}

  private nextId(): string {
    this.counter += 1;
    return `dsr-${this.counter}-${Date.now()}`;
  }

  async createDsr(req: CreateDsrRequest): Promise<DsrRequest> {
    const now = this.clock.nowIso();
    const dsr: DsrRequest = DsrRequestSchema.parse({
      id: this.nextId(),
      type: req.type,
      status: "pending" as DsrStatus,
      subject: req.subject,
      description: req.description,
      metadata: req.metadata,
      createdAt: now,
      updatedAt: now,
    });
    this.dsrs.set(dsr.id, dsr);
    return dsr;
  }

  async getDsr(id: string): Promise<Result<DsrRequest, DsrNotFoundError>> {
    const dsr = this.dsrs.get(id);
    if (!dsr) return err(new DsrNotFoundError(id));
    return ok(dsr);
  }

  async listDsrsBySubject(subjectId: string): Promise<readonly DsrRequest[]> {
    return Array.from(this.dsrs.values()).filter((d) => d.subject.id === subjectId);
  }

  async updateDsrStatus(
    id: string,
    status: DsrStatus,
    extra: Partial<Pick<DsrRequest, "rejectionReason" | "verifiedAt" | "completedAt" | "verificationMethod">> = {},
  ): Promise<Result<DsrRequest, DsrNotFoundError | DsrAlreadyCompletedError>> {
    const existing = this.dsrs.get(id);
    if (!existing) return err(new DsrNotFoundError(id));
    if (TERMINAL_STATUSES.has(existing.status)) {
      return err(new DsrAlreadyCompletedError(id));
    }
    const now = this.clock.nowIso();
    const updated: DsrRequest = {
      ...existing,
      status,
      updatedAt: now,
      ...(extra.rejectionReason !== undefined ? { rejectionReason: extra.rejectionReason } : {}),
      ...(extra.verifiedAt !== undefined ? { verifiedAt: extra.verifiedAt } : {}),
      ...(extra.completedAt !== undefined ? { completedAt: extra.completedAt } : {}),
      ...(extra.verificationMethod !== undefined ? { verificationMethod: extra.verificationMethod } : {}),
    };
    this.dsrs.set(id, updated);
    return ok(updated);
  }

  async saveConsent(record: ConsentRecord): Promise<void> {
    this.consents.set(record.id, record);
  }

  async getConsent(id: string): Promise<ConsentRecord | undefined> {
    return this.consents.get(id);
  }

  async listConsentsBySubject(subjectId: string): Promise<readonly ConsentRecord[]> {
    return Array.from(this.consents.values()).filter((c) => c.subjectId === subjectId);
  }

  async saveWorkflowState(state: DsrWorkflowState): Promise<void> {
    this.workflows.set(state.dsrId, state);
  }

  async getWorkflowState(dsrId: string): Promise<DsrWorkflowState | undefined> {
    return this.workflows.get(dsrId);
  }
}
