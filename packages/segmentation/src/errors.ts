// Domain errors for the segmentation module.
import { AppError } from "@veritas/core";

export class SegmentNotFoundError extends AppError {
  constructor(segmentId: string) {
    super("NOT_FOUND", 404, `Segment not found: ${segmentId}`);
  }
}

export class SegmentConflictError extends AppError {
  constructor(name: string) {
    super("CONFLICT", 409, `Segment already exists: ${name}`);
  }
}

export class InvalidRuleError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 422, `Invalid segment rule: ${detail}`);
  }
}

export class MembershipNotFoundError extends AppError {
  constructor(userId: string, segmentId: string) {
    super("NOT_FOUND", 404, `Membership not found for user ${userId} in segment ${segmentId}`);
  }
}
