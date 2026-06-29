// Shared NPS domain types used across the nps package.
import { z } from "zod";
import { Brand, brand } from "@veritas/core";

export type SurveyId = Brand<string, "SurveyId">;
export const newSurveyId = (): SurveyId => brand<string, "SurveyId">(crypto.randomUUID());

export type ResponseId = Brand<string, "ResponseId">;
export const newResponseId = (): ResponseId => brand<string, "ResponseId">(crypto.randomUUID());

export type SegmentId = Brand<string, "SegmentId">;
export const newSegmentId = (): SegmentId => brand<string, "SegmentId">(crypto.randomUUID());

/** NPS score 0–10 */
export type NpsRating = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const npsRatingSchema = z.number().int().min(0).max(10) as z.ZodType<NpsRating>;

export type Promoter = "promoter";
export type Passive = "passive";
export type Detractor = "detractor";
export type RespondentCategory = Promoter | Passive | Detractor;

export const categorizeRating = (rating: NpsRating): RespondentCategory => {
  if (rating >= 9) return "promoter";
  if (rating >= 7) return "passive";
  return "detractor";
};

export const SurveyStateSchema = z.enum(["draft", "active", "paused", "closed"]);
export type SurveyState = z.infer<typeof SurveyStateSchema>;

export const TriggerTypeSchema = z.enum([
  "post_verification",
  "milestone",
  "scheduled",
  "manual",
]);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export const SegmentKeySchema = z.enum(["plan", "org", "country", "cohort"]);
export type SegmentKey = z.infer<typeof SegmentKeySchema>;
