// Qualitative feedback attached to NPS responses for thematic analysis.
import { z } from "zod";
import { Result, ok, err } from "@veritas/core";
import { ResponseId, newResponseId } from "./types.js";
import { ResponseNotFoundError } from "./errors.js";

export const FeedbackThemeSchema = z.enum([
  "accuracy",
  "speed",
  "ui",
  "pricing",
  "support",
  "other",
]);
export type FeedbackTheme = z.infer<typeof FeedbackThemeSchema>;

export const FeedbackSchema = z.object({
  id: z.string(),
  responseId: z.string(),
  text: z.string().min(1).max(2000),
  themes: z.array(FeedbackThemeSchema),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  createdAt: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const CreateFeedbackSchema = FeedbackSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateFeedback = z.infer<typeof CreateFeedbackSchema>;

/** Infer sentiment from NPS rating bucket */
export const inferSentiment = (
  rating: number
): "positive" | "neutral" | "negative" => {
  if (rating >= 9) return "positive";
  if (rating >= 7) return "neutral";
  return "negative";
};

/** Build a Feedback record from validated input */
export const makeFeedback = (
  input: CreateFeedback,
  clock: () => string = () => new Date().toISOString()
): Feedback => ({
  id: (newResponseId() as unknown as string) + "_fb",
  responseId: input.responseId,
  text: input.text,
  themes: [...input.themes],
  sentiment: input.sentiment,
  createdAt: clock(),
});

/** Extract unique themes from a collection of feedback */
export const aggregateThemes = (
  feedbacks: readonly Feedback[]
): ReadonlyMap<FeedbackTheme, number> => {
  const counts = new Map<FeedbackTheme, number>();
  for (const fb of feedbacks) {
    for (const theme of fb.themes) {
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    }
  }
  return counts;
};

/** Validate and parse a raw CreateFeedback payload */
export const parseFeedback = (
  raw: unknown
): Result<CreateFeedback, string> => {
  const result = CreateFeedbackSchema.safeParse(raw);
  if (!result.success) {
    return err(result.error.issues.map((i) => i.message).join("; "));
  }
  return ok(result.data);
};
