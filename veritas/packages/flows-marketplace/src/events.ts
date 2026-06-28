// Domain events emitted by @veritas/flows-marketplace flows.

import { makeDomainEvent, type DomainEvent, type Clock, systemClock } from "@veritas/core";

// ── Event type literals ──────────────────────────────────────────────────────

export type MarketplaceFlowEventType =
  | "marketplace.agent_onboarded"
  | "marketplace.listing_published"
  | "marketplace.service_hired"
  | "marketplace.review_submitted"
  | "marketplace.reputation_updated";

// ── Payloads ─────────────────────────────────────────────────────────────────

export interface AgentOnboardedPayload {
  readonly agentId: string;
  readonly did: string;
  readonly registryId: string;
  readonly listingId?: string;
}

export interface ListingPublishedPayload {
  readonly listingId: string;
  readonly agentId: string;
  readonly serviceId: string;
  readonly title: string;
}

export interface ServiceHiredPayload {
  readonly listingId: string;
  readonly buyerAgentId: string;
  readonly sellerAgentId: string;
  readonly orderId: string;
}

export interface ReviewSubmittedPayload {
  readonly listingId: string;
  readonly reviewerId: string;
  readonly rating: number;
  readonly reviewId: string;
}

export interface ReputationUpdatedPayload {
  readonly agentId: string;
  readonly previousScore: number;
  readonly newScore: number;
  readonly reason: string;
}

// ── Typed event aliases ───────────────────────────────────────────────────────

export type AgentOnboardedEvent = DomainEvent<"marketplace.agent_onboarded", AgentOnboardedPayload>;
export type ListingPublishedEvent = DomainEvent<"marketplace.listing_published", ListingPublishedPayload>;
export type ServiceHiredEvent = DomainEvent<"marketplace.service_hired", ServiceHiredPayload>;
export type ReviewSubmittedEvent = DomainEvent<"marketplace.review_submitted", ReviewSubmittedPayload>;
export type ReputationUpdatedEvent = DomainEvent<"marketplace.reputation_updated", ReputationUpdatedPayload>;

export type MarketplaceFlowEvent =
  | AgentOnboardedEvent
  | ListingPublishedEvent
  | ServiceHiredEvent
  | ReviewSubmittedEvent
  | ReputationUpdatedEvent;

// ── Factories ─────────────────────────────────────────────────────────────────

export function makeAgentOnboardedEvent(
  payload: AgentOnboardedPayload,
  clock: Clock = systemClock,
): AgentOnboardedEvent {
  return makeDomainEvent({ type: "marketplace.agent_onboarded", payload }, clock);
}

export function makeListingPublishedEvent(
  payload: ListingPublishedPayload,
  clock: Clock = systemClock,
): ListingPublishedEvent {
  return makeDomainEvent({ type: "marketplace.listing_published", payload }, clock);
}

export function makeServiceHiredEvent(
  payload: ServiceHiredPayload,
  clock: Clock = systemClock,
): ServiceHiredEvent {
  return makeDomainEvent({ type: "marketplace.service_hired", payload }, clock);
}

export function makeReviewSubmittedEvent(
  payload: ReviewSubmittedPayload,
  clock: Clock = systemClock,
): ReviewSubmittedEvent {
  return makeDomainEvent({ type: "marketplace.review_submitted", payload }, clock);
}

export function makeReputationUpdatedEvent(
  payload: ReputationUpdatedPayload,
  clock: Clock = systemClock,
): ReputationUpdatedEvent {
  return makeDomainEvent({ type: "marketplace.reputation_updated", payload }, clock);
}
