// Domain events emitted by compliance flows: DSR, erasure, retention, consent, and audit export.

import { makeDomainEvent, type DomainEvent } from "@veritas/core";

// DSR fulfillment events
export type DsrFulfilledPayload = { readonly dsrId: string; readonly subjectId: string; readonly dsrType: string };
export type DsrFulfilledEvent = DomainEvent<"compliance.dsr.fulfilled", DsrFulfilledPayload>;

export function makeDsrFulfilledEvent(
  dsrId: string,
  subjectId: string,
  dsrType: string,
): DsrFulfilledEvent {
  return makeDomainEvent({ type: "compliance.dsr.fulfilled", payload: { dsrId, subjectId, dsrType } });
}

// Erasure events
export type ErasureCompletedPayload = { readonly subjectId: string; readonly recordsErased: number };
export type ErasureCompletedEvent = DomainEvent<"compliance.erasure.completed", ErasureCompletedPayload>;

export function makeErasureCompletedEvent(
  subjectId: string,
  recordsErased: number,
): ErasureCompletedEvent {
  return makeDomainEvent({ type: "compliance.erasure.completed", payload: { subjectId, recordsErased } });
}

// Retention purge events
export type RetentionPurgeCompletedPayload = { readonly purged: number; readonly failed: number };
export type RetentionPurgeCompletedEvent = DomainEvent<"compliance.retention.purge.completed", RetentionPurgeCompletedPayload>;

export function makeRetentionPurgeCompletedEvent(
  purged: number,
  failed: number,
): RetentionPurgeCompletedEvent {
  return makeDomainEvent({ type: "compliance.retention.purge.completed", payload: { purged, failed } });
}

// Audit export events
export type AuditExportedPayload = { readonly eventsExported: number; readonly format: string; readonly destination: string };
export type AuditExportedEvent = DomainEvent<"compliance.audit.exported", AuditExportedPayload>;

export function makeAuditExportedEvent(
  eventsExported: number,
  format: string,
  destination: string,
): AuditExportedEvent {
  return makeDomainEvent({ type: "compliance.audit.exported", payload: { eventsExported, format, destination } });
}

// Consent capture events
export type ConsentCapturedPayload = {
  readonly consentId: string;
  readonly userId: string;
  readonly purposeId: string;
  readonly status: string;
};
export type ConsentCapturedEvent = DomainEvent<"compliance.consent.captured", ConsentCapturedPayload>;

export function makeConsentCapturedEvent(
  consentId: string,
  userId: string,
  purposeId: string,
  status: string,
): ConsentCapturedEvent {
  return makeDomainEvent({ type: "compliance.consent.captured", payload: { consentId, userId, purposeId, status } });
}
