// NPS survey entity — create, update state, and read survey definitions.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import {
  SurveyId,
  newSurveyId,
  SurveyState,
  SurveyStateSchema,
  TriggerType,
  TriggerTypeSchema,
} from "./types.js";
import { SurveyNotFoundError } from "./errors.js";

const CreateSurveyInputSchema = z.object({
  title: z.string().min(1).max(200),
  question: z.string().min(1).max(500),
  followUpQuestion: z.string().max(500).optional(),
  triggerType: TriggerTypeSchema,
  delayMs: z.number().int().nonnegative().default(0),
  cooldownDays: z.number().int().positive().default(90),
  targetSegment: z.record(z.string()).optional(),
});

export type CreateSurveyInput = z.infer<typeof CreateSurveyInputSchema>;

export interface Survey {
  readonly id: SurveyId;
  readonly title: string;
  readonly question: string;
  readonly followUpQuestion: string | undefined;
  readonly triggerType: TriggerType;
  readonly delayMs: number;
  readonly cooldownDays: number;
  readonly targetSegment: Readonly<Record<string, string>> | undefined;
  readonly state: SurveyState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const createSurvey = (
  input: unknown
): Result<Survey, z.ZodError | Error> => {
  const parsed = CreateSurveyInputSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error);

  const now = new Date().toISOString();
  const data = parsed.data;
  const survey: Survey = {
    id: newSurveyId(),
    title: data.title,
    question: data.question,
    followUpQuestion: data.followUpQuestion,
    triggerType: data.triggerType,
    delayMs: data.delayMs,
    cooldownDays: data.cooldownDays,
    targetSegment: data.targetSegment
      ? Object.freeze({ ...data.targetSegment })
      : undefined,
    state: "draft",
    createdAt: now,
    updatedAt: now,
  };
  return ok(Object.freeze(survey));
};

export const activateSurvey = (survey: Survey): Result<Survey, Error> => {
  if (survey.state === "active") return ok(survey);
  if (survey.state === "closed")
    return err(new Error(`Cannot activate closed survey ${survey.id}`));
  return ok(
    Object.freeze({ ...survey, state: "active" as SurveyState, updatedAt: new Date().toISOString() })
  );
};

export const pauseSurvey = (survey: Survey): Result<Survey, Error> => {
  if (survey.state !== "active")
    return err(new Error(`Can only pause active surveys, got: ${survey.state}`));
  return ok(
    Object.freeze({ ...survey, state: "paused" as SurveyState, updatedAt: new Date().toISOString() })
  );
};

export const closeSurvey = (survey: Survey): Result<Survey, Error> => {
  if (survey.state === "closed") return ok(survey);
  return ok(
    Object.freeze({ ...survey, state: "closed" as SurveyState, updatedAt: new Date().toISOString() })
  );
};

export const findSurveyById = (
  surveys: readonly Survey[],
  id: SurveyId
): Result<Survey, SurveyNotFoundError> => {
  const found = surveys.find((s) => s.id === id);
  return found ? ok(found) : err(new SurveyNotFoundError(id));
};
