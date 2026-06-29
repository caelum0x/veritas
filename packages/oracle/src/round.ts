// Feed round data: structures and helpers for oracle round answers

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { InvalidRoundError } from "./errors.js";

/** A single oracle round answer with metadata */
export interface FeedRound {
  readonly roundId: number;
  readonly feedId: string;
  readonly answer: bigint;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly answeredInRound: number;
}

/** Schema for validating raw round data */
export const feedRoundSchema = z.object({
  roundId: z.number().int().nonnegative(),
  feedId: z.string().min(1),
  answer: z.bigint(),
  startedAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  answeredInRound: z.number().int().nonnegative(),
});

/** Validate that a round is internally consistent */
export function validateRound(round: FeedRound): Result<FeedRound, InvalidRoundError> {
  if (round.startedAt > round.updatedAt) {
    return err(new InvalidRoundError(`startedAt (${round.startedAt}) > updatedAt (${round.updatedAt})`));
  }
  if (round.answeredInRound < round.roundId) {
    return err(new InvalidRoundError(`answeredInRound (${round.answeredInRound}) < roundId (${round.roundId})`));
  }
  return ok(round);
}

/** Create a new FeedRound with current timestamp */
export function makeRound(
  feedId: string,
  roundId: number,
  answer: bigint,
  nowSeconds: number,
): FeedRound {
  return Object.freeze({
    roundId,
    feedId,
    answer,
    startedAt: nowSeconds,
    updatedAt: nowSeconds,
    answeredInRound: roundId,
  });
}

/** Return a copy of round with updated answer and timestamp */
export function updateRound(
  round: FeedRound,
  answer: bigint,
  updatedAt: number,
): FeedRound {
  return Object.freeze({ ...round, answer, updatedAt });
}

/** Compute age in seconds of a round relative to a reference time */
export function roundAgeSeconds(round: FeedRound, nowSeconds: number): number {
  return Math.max(0, nowSeconds - round.updatedAt);
}
