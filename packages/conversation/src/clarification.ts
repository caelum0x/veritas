// Clarifying questions engine: generate and resolve open questions about a claim
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { newId, epochToIso, systemClock, ValidationError } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { ClarificationStatus } from "./types.js";
import { ClarificationStatusSchema } from "./types.js";
import { ClarificationTimeoutError } from "./errors.js";

/** A single clarifying question posed to the user */
export interface ClarificationQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly rationale: string;
  readonly status: ClarificationStatus;
  readonly askedAt: string;
  readonly answeredAt: string | null;
  readonly answer: string | null;
}

export const ClarificationQuestionSchema = z.object({
  id: z.string(),
  questionText: z.string().min(1),
  rationale: z.string(),
  status: ClarificationStatusSchema,
  askedAt: z.string(),
  answeredAt: z.string().nullable(),
  answer: z.string().nullable(),
});

/** Parameters for creating a new clarification question */
export interface CreateClarificationParams {
  readonly questionText: string;
  readonly rationale: string;
}

/** Create a new unanswered clarification question */
export function createClarification(
  params: CreateClarificationParams,
): Result<ClarificationQuestion, AppError> {
  if (!params.questionText.trim()) {
    return err(new ValidationError({ message: "questionText must not be blank" }));
  }
  const question: ClarificationQuestion = {
    id: newId("clar"),
    questionText: params.questionText.trim(),
    rationale: params.rationale,
    status: "pending",
    askedAt: epochToIso(systemClock.now()),
    answeredAt: null,
    answer: null,
  };
  return ok(question);
}

/** Record a user's answer for a pending clarification */
export function answerClarification(
  question: ClarificationQuestion,
  answerText: string,
): Result<ClarificationQuestion, AppError> {
  if (question.status !== "pending") {
    return err(
      new ValidationError({
        message: `Cannot answer clarification in status '${question.status}'`,
        details: { questionId: question.id },
      }),
    );
  }
  if (!answerText.trim()) {
    return err(new ValidationError({ message: "Answer must not be blank" }));
  }
  return ok({
    ...question,
    status: "answered" as const,
    answeredAt: epochToIso(systemClock.now()),
    answer: answerText.trim(),
  });
}

/** Mark a pending clarification as skipped */
export function skipClarification(
  question: ClarificationQuestion,
): Result<ClarificationQuestion, AppError> {
  if (question.status !== "pending") {
    return err(
      new ValidationError({
        message: `Cannot skip clarification in status '${question.status}'`,
        details: { questionId: question.id },
      }),
    );
  }
  return ok({ ...question, status: "skipped" as const });
}

/** Expire a pending clarification that was not answered in time */
export function expireClarification(
  question: ClarificationQuestion,
): Result<ClarificationQuestion, AppError> {
  if (question.status !== "pending") {
    return err(new ClarificationTimeoutError(question.id));
  }
  return ok({ ...question, status: "expired" as const });
}

/** Check whether all questions in a list have been resolved (answered/skipped/expired) */
export function allResolved(questions: ReadonlyArray<ClarificationQuestion>): boolean {
  return questions.every((q) => q.status !== "pending");
}

/** Filter to only pending questions */
export function pendingQuestions(
  questions: ReadonlyArray<ClarificationQuestion>,
): ReadonlyArray<ClarificationQuestion> {
  return questions.filter((q) => q.status === "pending");
}
