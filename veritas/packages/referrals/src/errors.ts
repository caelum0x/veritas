// Domain-specific error types for the referrals module.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class ReferralCodeNotFoundError extends AppError {
  constructor(referralCode: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Referral code not found: ${referralCode}`, options);
  }
}

export class ReferralNotFoundError extends AppError {
  constructor(referralId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Referral not found: ${referralId}`, options);
  }
}

export class SelfReferralError extends AppError {
  constructor(userId: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `User ${userId} cannot refer themselves`, options);
  }
}

export class DuplicateReferralError extends AppError {
  constructor(referrerId: string, refereeId: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Referral already exists from ${referrerId} to ${refereeId}`, options);
  }
}

export class ReferralProgramNotFoundError extends AppError {
  constructor(programId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Referral program not found: ${programId}`, options);
  }
}

export class ReferralProgramInactiveError extends AppError {
  constructor(programId: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Referral program is not active: ${programId}`, options);
  }
}

export class RewardAlreadyRedeemedError extends AppError {
  constructor(rewardId: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Reward already redeemed: ${rewardId}`, options);
  }
}

export class RewardNotEligibleError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("VALIDATION", 422, `Reward not eligible: ${reason}`, options);
  }
}

export class FraudSuspectedError extends AppError {
  constructor(reason: string, options?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Fraud suspected: ${reason}`, options);
  }
}
