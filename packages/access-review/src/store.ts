// In-memory store for access review campaigns, decisions, certifications, and entitlements.
import { type Result, ok, err } from "@veritas/core";
import type { AccessReview } from "./review.js";
import type { AccessCertification } from "./certification.js";
import type { Entitlement } from "./entitlement.js";
import type { ReviewerAssignment } from "./reviewer.js";
import type { ReviewDecision } from "./decision.js";
import type { ReviewSchedule } from "./schedule.js";
import {
  AccessReviewNotFoundError,
  CertificationNotFoundError,
  DecisionNotFoundError,
  ReviewerNotFoundError,
  EntitlementNotFoundError,
} from "./errors.js";

export interface ReviewStore {
  // Reviews
  saveReview(review: AccessReview): Promise<Result<AccessReview>>;
  getReview(id: string): Promise<Result<AccessReview>>;
  listReviews(organizationId: string): Promise<Result<readonly AccessReview[]>>;
  deleteReview(id: string): Promise<Result<void>>;

  // Certifications
  saveCertification(cert: AccessCertification): Promise<Result<AccessCertification>>;
  getCertification(id: string): Promise<Result<AccessCertification>>;
  listCertificationsByReview(reviewId: string): Promise<Result<readonly AccessCertification[]>>;

  // Entitlements
  saveEntitlement(entitlement: Entitlement): Promise<Result<Entitlement>>;
  getEntitlement(id: string): Promise<Result<Entitlement>>;
  listEntitlementsByUser(userId: string): Promise<Result<readonly Entitlement[]>>;

  // Reviewers
  saveReviewer(reviewer: ReviewerAssignment): Promise<Result<ReviewerAssignment>>;
  getReviewer(id: string): Promise<Result<ReviewerAssignment>>;
  listReviewersByReview(reviewId: string): Promise<Result<readonly ReviewerAssignment[]>>;

  // Decisions
  saveDecision(decision: ReviewDecision): Promise<Result<ReviewDecision>>;
  getDecision(id: string): Promise<Result<ReviewDecision>>;
  listDecisionsByReview(reviewId: string): Promise<Result<readonly ReviewDecision[]>>;
  findDecisionByEntitlement(reviewId: string, entitlementId: string): Promise<Result<ReviewDecision | undefined>>;

  // Schedules
  saveSchedule(schedule: ReviewSchedule): Promise<Result<ReviewSchedule>>;
  getSchedule(id: string): Promise<Result<ReviewSchedule>>;
  listSchedulesByOrg(organizationId: string): Promise<Result<readonly ReviewSchedule[]>>;
}

export function createInMemoryReviewStore(): ReviewStore {
  const reviews = new Map<string, AccessReview>();
  const certifications = new Map<string, AccessCertification>();
  const entitlements = new Map<string, Entitlement>();
  const reviewers = new Map<string, ReviewerAssignment>();
  const decisions = new Map<string, ReviewDecision>();
  const schedules = new Map<string, ReviewSchedule>();

  return {
    async saveReview(review) {
      reviews.set(review.id, review);
      return ok(review);
    },
    async getReview(id) {
      const review = reviews.get(id);
      if (!review) return err(new AccessReviewNotFoundError(id));
      return ok(review);
    },
    async listReviews(organizationId) {
      const result = [...reviews.values()].filter(
        (r) => r.orgId === organizationId
      );
      return ok(result);
    },
    async deleteReview(id) {
      if (!reviews.has(id)) return err(new AccessReviewNotFoundError(id));
      reviews.delete(id);
      return ok(undefined);
    },

    async saveCertification(cert) {
      certifications.set(cert.id, cert);
      return ok(cert);
    },
    async getCertification(id) {
      const cert = certifications.get(id);
      if (!cert) return err(new CertificationNotFoundError(id));
      return ok(cert);
    },
    async listCertificationsByReview(reviewId) {
      const result = [...certifications.values()].filter(
        (c) => c.reviewId === reviewId
      );
      return ok(result);
    },

    async saveEntitlement(entitlement) {
      entitlements.set(entitlement.id, entitlement);
      return ok(entitlement);
    },
    async getEntitlement(id) {
      const e = entitlements.get(id);
      if (!e) return err(new EntitlementNotFoundError(id));
      return ok(e);
    },
    async listEntitlementsByUser(userId) {
      const result = [...entitlements.values()].filter((e) => e.userId === userId);
      return ok(result);
    },

    async saveReviewer(reviewer) {
      reviewers.set(reviewer.id, reviewer);
      return ok(reviewer);
    },
    async getReviewer(id) {
      const r = reviewers.get(id);
      if (!r) return err(new ReviewerNotFoundError(id));
      return ok(r);
    },
    async listReviewersByReview(reviewId) {
      const result = [...reviewers.values()].filter((r) => r.reviewId === reviewId);
      return ok(result);
    },

    async saveDecision(decision) {
      decisions.set(decision.id, decision);
      return ok(decision);
    },
    async getDecision(id) {
      const d = decisions.get(id);
      if (!d) return err(new DecisionNotFoundError(id));
      return ok(d);
    },
    async listDecisionsByReview(reviewId) {
      const result = [...decisions.values()].filter((d) => d.reviewId === reviewId);
      return ok(result);
    },
    async findDecisionByEntitlement(reviewId, entitlementId) {
      const found = [...decisions.values()].find(
        (d) => d.reviewId === reviewId && d.entitlementId === entitlementId
      );
      return ok(found);
    },

    async saveSchedule(schedule) {
      schedules.set(schedule.id, schedule);
      return ok(schedule);
    },
    async getSchedule(id) {
      const s = schedules.get(id);
      if (!s) return err(new AccessReviewNotFoundError(id));
      return ok(s);
    },
    async listSchedulesByOrg(organizationId) {
      const result = [...schedules.values()].filter(
        (s) => s.organizationId === organizationId
      );
      return ok(result);
    },
  };
}
