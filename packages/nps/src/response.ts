// NPS survey response — record a user's rating and optional follow-up text.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import {
  ResponseId,
  newResponseId,
  SurveyId,
  NpsRating,
  npsRatingSchema,
  RespondentCategory,
  categorizeRating,
} from "./types.js";
import {
  InvalidRatingError,
  SurveyNotActiveError,
  DuplicateResponseError,
  ResponseNotFoundError,
} from "./errors.js";
import { Survey } from "./survey.js";

const CreateResponseInputSchema = z.object({
  surveyId: z.string(),
  userId: z.string().min(1),
  rating: npsRatingSchema,
  followUpText: z.string().max(2000).optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreateResponseInput = z.infer<typeof CreateResponseInputSchema>;

export interface NpsResponse {
  readonly id: ResponseId;
  readonly surveyId: SurveyId;
  readonly userId: string;
  readonly rating: NpsRating;
  readonly category: RespondentCategory;
  readonly followUpText: string | undefined;
  readonly metadata: Readonly<Record<string, string>> | undefined;
  readonly createdAt: string;
}

export const recordResponse = (
  survey: Survey,
  existingResponses: readonly NpsResponse[],
  input: unknown
): Result<NpsResponse, InvalidRatingError | SurveyNotActiveError | DuplicateResponseError | z.ZodError> => {
  const parsed = CreateResponseInputSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error);

  const { userId, rating, followUpText, metadata } = parsed.data;

  if (survey.state !== "active") {
    return err(new SurveyNotActiveError(survey.id, survey.state));
  }

  const alreadyResponded = existingResponses.some(
    (r) => r.userId === userId && r.surveyId === survey.id
  );
  if (alreadyResponded) {
    return err(new DuplicateResponseError(userId, survey.id));
  }

  const ratingResult = npsRatingSchema.safeParse(rating);
  if (!ratingResult.success) return err(new InvalidRatingError(rating));

  const response: NpsResponse = {
    id: newResponseId(),
    surveyId: survey.id,
    userId,
    rating,
    category: categorizeRating(rating),
    followUpText,
    metadata: metadata ? Object.freeze({ ...metadata }) : undefined,
    createdAt: new Date().toISOString(),
  };

  return ok(Object.freeze(response));
};

export const findResponseById = (
  responses: readonly NpsResponse[],
  id: ResponseId
): Result<NpsResponse, ResponseNotFoundError> => {
  const found = responses.find((r) => r.id === id);
  return found ? ok(found) : err(new ResponseNotFoundError(id));
};

export const responsesForSurvey = (
  responses: readonly NpsResponse[],
  surveyId: SurveyId
): readonly NpsResponse[] =>
  responses.filter((r) => r.surveyId === surveyId);
