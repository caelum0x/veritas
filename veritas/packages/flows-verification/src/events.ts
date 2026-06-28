// Domain events emitted by verification flows.
import { makeDomainEvent, type DomainEvent } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";

export type VerificationFlowStarted = DomainEvent<"VerificationFlowStarted", { claimText: string }>;
export type VerificationFlowCompleted = DomainEvent<"VerificationFlowCompleted", { trustScore: number; summary: string }>;
export type VerificationFlowFailed = DomainEvent<"VerificationFlowFailed", { reason: string }>;
export type AttestationFlowCompleted = DomainEvent<"AttestationFlowCompleted", { attestationUid: string }>;
export type IngestionFlowCompleted = DomainEvent<"IngestionFlowCompleted", { documentId: string }>;
export type CacheHitEvent = DomainEvent<"CacheHitEvent", { fingerprint: string }>;
export type QualityGatePassedEvent = DomainEvent<"QualityGatePassedEvent", Record<string, never>>;
export type QualityGateFailedEvent = DomainEvent<"QualityGateFailedEvent", { blockingCount: number }>;

export function makeVerificationFlowStarted(claimText: string): VerificationFlowStarted {
  return makeDomainEvent({ type: "VerificationFlowStarted", payload: { claimText } });
}

export function makeVerificationFlowCompleted(
  report: VerificationReport
): VerificationFlowCompleted {
  return makeDomainEvent({
    type: "VerificationFlowCompleted",
    payload: { trustScore: report.trustScore, summary: report.summary },
  });
}

export function makeVerificationFlowFailed(reason: string): VerificationFlowFailed {
  return makeDomainEvent({ type: "VerificationFlowFailed", payload: { reason } });
}

export function makeAttestationFlowCompleted(
  attestationUid: string
): AttestationFlowCompleted {
  return makeDomainEvent({ type: "AttestationFlowCompleted", payload: { attestationUid } });
}

export function makeIngestionFlowCompleted(documentId: string): IngestionFlowCompleted {
  return makeDomainEvent({ type: "IngestionFlowCompleted", payload: { documentId } });
}

export function makeCacheHitEvent(fingerprint: string): CacheHitEvent {
  return makeDomainEvent({ type: "CacheHitEvent", payload: { fingerprint } });
}

export function makeQualityGatePassedEvent(): QualityGatePassedEvent {
  return makeDomainEvent({ type: "QualityGatePassedEvent", payload: {} });
}

export function makeQualityGateFailedEvent(blockingCount: number): QualityGateFailedEvent {
  return makeDomainEvent({ type: "QualityGateFailedEvent", payload: { blockingCount } });
}
