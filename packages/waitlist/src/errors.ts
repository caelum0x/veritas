// Waitlist-specific error types extending AppError.
import { AppError } from "@veritas/core";

export class WaitlistNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, "Waitlist entry not found", { message: `Waitlist entry not found: ${id}` });
  }
}

export class WaitlistAlreadyExistsError extends AppError {
  constructor(email: string) {
    super("CONFLICT", 409, "Email already on waitlist", { message: `Email already on waitlist: ${email}` });
  }
}

export class WaitlistFullError extends AppError {
  constructor(capacity: number) {
    super("CONFLICT", 409, "Waitlist has reached capacity", { message: `Waitlist has reached capacity: ${capacity}` });
  }
}

export class InvalidReferralCodeError extends AppError {
  constructor(code: string) {
    super("VALIDATION", 400, "Invalid referral code", { message: `Invalid referral code: ${code}` });
  }
}

export class InviteAlreadySentError extends AppError {
  constructor(entryId: string) {
    super("CONFLICT", 409, "Invite already sent", { message: `Invite already sent for entry: ${entryId}` });
  }
}

export class WaitlistClosedError extends AppError {
  constructor() {
    super("CONFLICT", 409, "Waitlist is currently closed");
  }
}
