// In-memory NPS store: surveys, responses, and feedback with typed query support.
import { Result, ok, err } from "@veritas/core";
import {
  SurveyId,
  ResponseId,
  SegmentId,
  NpsRating,
  SurveyState,
  categorizeRating,
  newSurveyId,
  newResponseId,
} from "./types.js";
import {
  SurveyNotFoundError,
  ResponseNotFoundError,
  SurveyNotActiveError,
  DuplicateResponseError,
} from "./errors.js";
import { Feedback, makeFeedback, CreateFeedback } from "./feedback.js";

export interface Survey {
  readonly id: SurveyId;
  readonly title: string;
  readonly question: string;
  readonly state: SurveyState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NpsResponse {
  readonly id: ResponseId;
  readonly surveyId: SurveyId;
  readonly userId: string;
  readonly rating: NpsRating;
  readonly category: "promoter" | "passive" | "detractor";
  readonly segmentId: SegmentId | null;
  readonly createdAt: string;
}

export interface CreateSurvey {
  readonly title: string;
  readonly question: string;
}

export interface CreateNpsResponse {
  readonly surveyId: SurveyId;
  readonly userId: string;
  readonly rating: NpsRating;
  readonly segmentId?: SegmentId;
  readonly feedback?: string;
}

export interface NpsStore {
  createSurvey(input: CreateSurvey): Survey;
  getSurvey(id: SurveyId): Result<Survey, SurveyNotFoundError>;
  updateSurveyState(
    id: SurveyId,
    state: SurveyState
  ): Result<Survey, SurveyNotFoundError>;
  listSurveys(): readonly Survey[];

  recordResponse(
    input: CreateNpsResponse
  ): Result<NpsResponse, SurveyNotFoundError | SurveyNotActiveError | DuplicateResponseError>;
  getResponse(id: ResponseId): Result<NpsResponse, ResponseNotFoundError>;
  listResponses(surveyId: SurveyId): readonly NpsResponse[];

  addFeedback(
    input: CreateFeedback
  ): Result<Feedback, ResponseNotFoundError>;
  listFeedback(surveyId: SurveyId): readonly Feedback[];
}

const now = (): string => new Date().toISOString();

export const createInMemoryNpsStore = (): NpsStore => {
  const surveys = new Map<string, Survey>();
  const responses = new Map<string, NpsResponse>();
  const feedbacks = new Map<string, Feedback[]>();
  const userResponses = new Map<string, Set<string>>();

  return {
    createSurvey(input: CreateSurvey): Survey {
      const ts = now();
      const survey: Survey = {
        id: newSurveyId(),
        title: input.title,
        question: input.question,
        state: "draft",
        createdAt: ts,
        updatedAt: ts,
      };
      surveys.set(survey.id as string, survey);
      return survey;
    },

    getSurvey(id: SurveyId): Result<Survey, SurveyNotFoundError> {
      const survey = surveys.get(id as string);
      if (!survey) return err(new SurveyNotFoundError(id as string));
      return ok(survey);
    },

    updateSurveyState(
      id: SurveyId,
      state: SurveyState
    ): Result<Survey, SurveyNotFoundError> {
      const survey = surveys.get(id as string);
      if (!survey) return err(new SurveyNotFoundError(id as string));
      const updated: Survey = { ...survey, state, updatedAt: now() };
      surveys.set(id as string, updated);
      return ok(updated);
    },

    listSurveys(): readonly Survey[] {
      return Array.from(surveys.values());
    },

    recordResponse(
      input: CreateNpsResponse
    ): Result<NpsResponse, SurveyNotFoundError | SurveyNotActiveError | DuplicateResponseError> {
      const survey = surveys.get(input.surveyId as string);
      if (!survey) return err(new SurveyNotFoundError(input.surveyId as string));
      if (survey.state !== "active") {
        return err(new SurveyNotActiveError(input.surveyId as string, survey.state));
      }
      const userKey = `${input.userId}:${input.surveyId as string}`;
      if (userResponses.get(userKey)?.has(input.surveyId as string)) {
        return err(new DuplicateResponseError(input.userId, input.surveyId as string));
      }
      const response: NpsResponse = {
        id: newResponseId(),
        surveyId: input.surveyId,
        userId: input.userId,
        rating: input.rating,
        category: categorizeRating(input.rating),
        segmentId: input.segmentId ?? null,
        createdAt: now(),
      };
      responses.set(response.id as string, response);
      if (!userResponses.has(userKey)) userResponses.set(userKey, new Set());
      userResponses.get(userKey)!.add(input.surveyId as string);
      return ok(response);
    },

    getResponse(id: ResponseId): Result<NpsResponse, ResponseNotFoundError> {
      const response = responses.get(id as string);
      if (!response) return err(new ResponseNotFoundError(id as string));
      return ok(response);
    },

    listResponses(surveyId: SurveyId): readonly NpsResponse[] {
      return Array.from(responses.values()).filter(
        (r) => (r.surveyId as string) === (surveyId as string)
      );
    },

    addFeedback(input: CreateFeedback): Result<Feedback, ResponseNotFoundError> {
      const response = responses.get(input.responseId);
      if (!response) return err(new ResponseNotFoundError(input.responseId));
      const fb = makeFeedback(input);
      const surveyKey = response.surveyId as string;
      const list = feedbacks.get(surveyKey) ?? [];
      feedbacks.set(surveyKey, [...list, fb]);
      return ok(fb);
    },

    listFeedback(surveyId: SurveyId): readonly Feedback[] {
      return feedbacks.get(surveyId as string) ?? [];
    },
  };
};
