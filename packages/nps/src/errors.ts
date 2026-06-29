// NPS-specific error subtypes extending AppError.
import { AppError } from "@veritas/core";

export class SurveyNotFoundError extends AppError {
  constructor(surveyId: string) {
    super("NOT_FOUND", 404, `Survey not found: ${surveyId}`);
    this.name = "SurveyNotFoundError";
  }
}

export class ResponseNotFoundError extends AppError {
  constructor(responseId: string) {
    super("NOT_FOUND", 404, `NPS response not found: ${responseId}`);
    this.name = "ResponseNotFoundError";
  }
}

export class SurveyNotActiveError extends AppError {
  constructor(surveyId: string, state: string) {
    super("CONFLICT", 409, `Survey ${surveyId} is not active (state: ${state})`);
    this.name = "SurveyNotActiveError";
  }
}

export class DuplicateResponseError extends AppError {
  constructor(userId: string, surveyId: string) {
    super("CONFLICT", 409, `User ${userId} has already responded to survey ${surveyId}`);
    this.name = "DuplicateResponseError";
  }
}

export class InvalidRatingError extends AppError {
  constructor(value: unknown) {
    super("VALIDATION", 422, `Invalid NPS rating: ${String(value)}. Must be integer 0–10`);
    this.name = "InvalidRatingError";
  }
}

export class FeedbackNotFoundError extends AppError {
  constructor(feedbackId: string) {
    super("NOT_FOUND", 404, `Feedback not found: ${feedbackId}`);
    this.name = "FeedbackNotFoundError";
  }
}
