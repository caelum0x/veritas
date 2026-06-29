// Maps @veritas/gdpr domain types to HTTP response shapes for DSR endpoints.

import type { DsrRequest, DsrWorkflowState } from "@veritas/gdpr";

export interface DsrResponse {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly subject: {
    readonly id: string;
    readonly email: string;
    readonly name?: string;
    readonly organizationId?: string;
  };
  readonly description?: string;
  readonly verificationMethod?: string;
  readonly verifiedAt?: string;
  readonly completedAt?: string;
  readonly rejectionReason?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowResponse {
  readonly dsrId: string;
  readonly currentStep: number;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly steps: ReadonlyArray<{
    readonly name: string;
    readonly status: string;
    readonly startedAt?: string;
    readonly completedAt?: string;
    readonly error?: string;
  }>;
}

export function toDsrResponse(dsr: DsrRequest): DsrResponse {
  return {
    id: dsr.id,
    type: dsr.type,
    status: dsr.status,
    subject: {
      id: dsr.subject.id,
      email: dsr.subject.email,
      name: dsr.subject.name,
      organizationId: dsr.subject.organizationId,
    },
    description: dsr.description,
    verificationMethod: dsr.verificationMethod,
    verifiedAt: dsr.verifiedAt,
    completedAt: dsr.completedAt,
    rejectionReason: dsr.rejectionReason,
    metadata: dsr.metadata,
    createdAt: dsr.createdAt,
    updatedAt: dsr.updatedAt,
  };
}

export function toWorkflowResponse(state: DsrWorkflowState): WorkflowResponse {
  return {
    dsrId: state.dsrId,
    currentStep: state.currentStep,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    steps: state.steps.map((s) => ({
      name: s.name,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      error: s.error,
    })),
  };
}
