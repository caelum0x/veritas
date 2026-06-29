// DSR workflow: end-to-end lifecycle management from receipt through completion with SLA tracking.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type Id, newId } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import { MemoryStore } from "@veritas/persistence";
import { type DsrType, DsrTypeSchema, type DsrStatus, type DsrProcessor, type ProcessorExecutionSummary } from "./processor.js";

export type WorkflowId = Id<"dsrwf">;
export const newWorkflowId = (): WorkflowId => newId("dsrwf");

/** GDPR mandates 30-day response window; 28 days gives buffer. */
const DEFAULT_SLA_DAYS = 28;

export const WorkflowStepSchema = z.object({
  step: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "skipped"]),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  notes: z.string().nullable(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const DsrWorkflowSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  subjectId: z.string(),
  type: DsrTypeSchema,
  status: z.enum(["pending", "in_progress", "awaiting_verification", "completed", "rejected", "cancelled"]),
  steps: z.array(WorkflowStepSchema),
  receivedAt: z.string(),
  dueBy: z.string(),
  completedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  executionSummary: z.unknown().nullable(),
});
export type DsrWorkflow = z.infer<typeof DsrWorkflowSchema>;

const WORKFLOW_STEPS: readonly string[] = [
  "receive",
  "verify_identity",
  "validate_request",
  "execute",
  "notify_subject",
];

function buildInitialSteps(): WorkflowStep[] {
  return WORKFLOW_STEPS.map((step) => ({
    step,
    status: "pending",
    startedAt: null,
    completedAt: null,
    notes: null,
  }));
}

function updateStep(
  steps: readonly WorkflowStep[],
  stepName: string,
  patch: Partial<WorkflowStep>,
): WorkflowStep[] {
  return steps.map((s) => (s.step === stepName ? { ...s, ...patch } : s));
}

export interface CreateDsrWorkflowInput {
  readonly requestId: string;
  readonly subjectId: string;
  readonly type: DsrType;
  readonly slaDays?: number;
}

export interface DsrWorkflowEngine {
  create(input: CreateDsrWorkflowInput): Result<DsrWorkflow>;
  advance(workflowId: string, step: string, notes?: string): Result<DsrWorkflow>;
  fail(workflowId: string, step: string, reason: string): Result<DsrWorkflow>;
  reject(workflowId: string, reason: string): Result<DsrWorkflow>;
  cancel(workflowId: string, reason?: string): Result<DsrWorkflow>;
  complete(workflowId: string, summary: ProcessorExecutionSummary): Result<DsrWorkflow>;
  findById(workflowId: string): DsrWorkflow | undefined;
  findBySubject(subjectId: string): DsrWorkflow[];
  findOverdue(): DsrWorkflow[];
  list(): DsrWorkflow[];
}

export class InMemoryDsrWorkflowEngine implements DsrWorkflowEngine {
  private readonly store = new MemoryStore<DsrWorkflow & { readonly id: string }>();

  create(input: CreateDsrWorkflowInput): Result<DsrWorkflow> {
    const now = Date.now();
    const slaDays = input.slaDays ?? DEFAULT_SLA_DAYS;
    const dueBy = epochToIso(now + slaDays * 86_400_000);

    const steps = buildInitialSteps();
    const receiveIdx = steps.findIndex((s) => s.step === "receive");
    if (receiveIdx !== -1) {
      steps[receiveIdx] = {
        ...steps[receiveIdx]!,
        status: "completed",
        startedAt: epochToIso(now),
        completedAt: epochToIso(now),
      };
    }

    const workflow: DsrWorkflow = {
      id: newWorkflowId(),
      requestId: input.requestId,
      subjectId: input.subjectId,
      type: input.type,
      status: "pending",
      steps,
      receivedAt: epochToIso(now),
      dueBy,
      completedAt: null,
      rejectionReason: null,
      executionSummary: null,
    };

    this.store.set(workflow);
    return ok(workflow);
  }

  advance(workflowId: string, step: string, notes?: string): Result<DsrWorkflow> {
    const wf = this.store.get(workflowId);
    if (wf === undefined) return err(new Error(`Workflow not found: ${workflowId}`));
    if (wf.status === "completed" || wf.status === "rejected" || wf.status === "cancelled") {
      return err(new Error(`Workflow ${workflowId} is already in terminal state: ${wf.status}`));
    }

    const now = epochToIso(Date.now());
    const steps = updateStep(wf.steps, step, {
      status: "completed",
      startedAt: now,
      completedAt: now,
      notes: notes ?? null,
    });

    const updated: DsrWorkflow = { ...wf, steps, status: "in_progress" };
    this.store.set(updated);
    return ok(updated);
  }

  fail(workflowId: string, step: string, reason: string): Result<DsrWorkflow> {
    const wf = this.store.get(workflowId);
    if (wf === undefined) return err(new Error(`Workflow not found: ${workflowId}`));

    const now = epochToIso(Date.now());
    const steps = updateStep(wf.steps, step, {
      status: "failed",
      completedAt: now,
      notes: reason,
    });

    const updated: DsrWorkflow = { ...wf, steps };
    this.store.set(updated);
    return ok(updated);
  }

  reject(workflowId: string, reason: string): Result<DsrWorkflow> {
    const wf = this.store.get(workflowId);
    if (wf === undefined) return err(new Error(`Workflow not found: ${workflowId}`));

    const updated: DsrWorkflow = {
      ...wf,
      status: "rejected",
      rejectionReason: reason,
      completedAt: epochToIso(Date.now()),
    };
    this.store.set(updated);
    return ok(updated);
  }

  cancel(workflowId: string, reason?: string): Result<DsrWorkflow> {
    const wf = this.store.get(workflowId);
    if (wf === undefined) return err(new Error(`Workflow not found: ${workflowId}`));

    const updated: DsrWorkflow = {
      ...wf,
      status: "cancelled",
      rejectionReason: reason ?? null,
      completedAt: epochToIso(Date.now()),
    };
    this.store.set(updated);
    return ok(updated);
  }

  complete(workflowId: string, summary: ProcessorExecutionSummary): Result<DsrWorkflow> {
    const wf = this.store.get(workflowId);
    if (wf === undefined) return err(new Error(`Workflow not found: ${workflowId}`));

    const now = epochToIso(Date.now());
    const steps = updateStep(wf.steps, "notify_subject", {
      status: "completed",
      startedAt: now,
      completedAt: now,
    });

    const updated: DsrWorkflow = {
      ...wf,
      status: "completed",
      completedAt: now,
      executionSummary: summary,
      steps,
    };
    this.store.set(updated);
    return ok(updated);
  }

  findById(workflowId: string): DsrWorkflow | undefined {
    return this.store.get(workflowId);
  }

  findBySubject(subjectId: string): DsrWorkflow[] {
    return this.store.all().filter((w) => w.subjectId === subjectId);
  }

  findOverdue(): DsrWorkflow[] {
    const now = Date.now();
    return this.store
      .all()
      .filter(
        (w) =>
          w.status !== "completed" &&
          w.status !== "rejected" &&
          w.status !== "cancelled" &&
          new Date(w.dueBy).getTime() < now,
      );
  }

  list(): DsrWorkflow[] {
    return this.store.all();
  }
}
