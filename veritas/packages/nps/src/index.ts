// Public surface of @veritas/nps — re-exports all NPS domain types, errors, feedback, and store.
export type {
  SurveyId,
  ResponseId,
  SegmentId,
  NpsRating,
  RespondentCategory,
  Promoter,
  Passive,
  Detractor,
  SurveyState,
  TriggerType,
  SegmentKey,
} from "./types.js";

export {
  newSurveyId,
  newResponseId,
  newSegmentId,
  npsRatingSchema,
  categorizeRating,
  SurveyStateSchema,
  TriggerTypeSchema,
  SegmentKeySchema,
} from "./types.js";

export {
  SurveyNotFoundError,
  ResponseNotFoundError,
  SurveyNotActiveError,
  DuplicateResponseError,
  InvalidRatingError,
  FeedbackNotFoundError,
} from "./errors.js";

export type {
  Feedback,
  CreateFeedback,
  FeedbackTheme,
} from "./feedback.js";

export {
  FeedbackThemeSchema,
  FeedbackSchema,
  CreateFeedbackSchema,
  inferSentiment,
  makeFeedback,
  aggregateThemes,
  parseFeedback,
} from "./feedback.js";

export type {
  Survey,
  NpsResponse,
  CreateSurvey,
  CreateNpsResponse,
  NpsStore,
} from "./store.js";

export { createInMemoryNpsStore } from "./store.js";
