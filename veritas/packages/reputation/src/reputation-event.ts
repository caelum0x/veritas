// Reputation domain events emitted when agent scores or reviews change.

import {
  makeDomainEvent,
  type DomainEvent,
  type UserId,
  type Clock,
  systemClock,
} from "@veritas/core";
import type { PtsScore } from "./pts-score.js";

// ── Event type literals ────────────────────────────────────────────────────

export type RepEventType =
  | "reputation.score_updated"
  | "reputation.review_submitted"
  | "reputation.badge_awarded"
  | "reputation.badge_revoked";

// ── Payloads ───────────────────────────────────────────────────────────────

export interface ScoreUpdatedPayload {
  readonly agentId: string;
  readonly previousScore: PtsScore;
  readonly newScore: PtsScore;
  readonly reason: string;
}

export interface ReviewSubmittedPayload {
  readonly reviewId: string;
  readonly agentId: string;
  readonly reviewerId: UserId;
  readonly rating: number;
}

export interface BadgeAwardedPayload {
  readonly agentId: string;
  readonly badgeId: string;
  readonly badgeName: string;
}

export interface BadgeRevokedPayload {
  readonly agentId: string;
  readonly badgeId: string;
  readonly reason: string;
}

// ── Typed event aliases ────────────────────────────────────────────────────

export type ScoreUpdatedEvent = DomainEvent<
  "reputation.score_updated",
  ScoreUpdatedPayload
>;

export type ReviewSubmittedEvent = DomainEvent<
  "reputation.review_submitted",
  ReviewSubmittedPayload
>;

export type BadgeAwardedEvent = DomainEvent<
  "reputation.badge_awarded",
  BadgeAwardedPayload
>;

export type BadgeRevokedEvent = DomainEvent<
  "reputation.badge_revoked",
  BadgeRevokedPayload
>;

export type ReputationEvent =
  | ScoreUpdatedEvent
  | ReviewSubmittedEvent
  | BadgeAwardedEvent
  | BadgeRevokedEvent;

// ── Factories ──────────────────────────────────────────────────────────────

export function makeScoreUpdatedEvent(
  payload: ScoreUpdatedPayload,
  clock: Clock = systemClock,
): ScoreUpdatedEvent {
  return makeDomainEvent({ type: "reputation.score_updated", payload }, clock);
}

export function makeReviewSubmittedEvent(
  payload: ReviewSubmittedPayload,
  clock: Clock = systemClock,
): ReviewSubmittedEvent {
  return makeDomainEvent({ type: "reputation.review_submitted", payload }, clock);
}

export function makeBadgeAwardedEvent(
  payload: BadgeAwardedPayload,
  clock: Clock = systemClock,
): BadgeAwardedEvent {
  return makeDomainEvent({ type: "reputation.badge_awarded", payload }, clock);
}

export function makeBadgeRevokedEvent(
  payload: BadgeRevokedPayload,
  clock: Clock = systemClock,
): BadgeRevokedEvent {
  return makeDomainEvent({ type: "reputation.badge_revoked", payload }, clock);
}
