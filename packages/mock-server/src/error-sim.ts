// Simulates error conditions (random failures, circuit-open, timeout) for mock responses.
import { z } from "zod";
import { MockResponseSchema, type MockResponse } from "./mock.js";

export const ErrorSimProfileSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("random"),
    errorRate: z.number().min(0).max(1),
    response: MockResponseSchema,
  }),
  z.object({
    kind: z.literal("circuit-open"),
    response: MockResponseSchema,
  }),
  z.object({
    kind: z.literal("timeout"),
    delayMs: z.number().int().min(0),
    response: MockResponseSchema,
  }),
  z.object({
    kind: z.literal("sequential"),
    pattern: z.array(z.boolean()).min(1),
    response: MockResponseSchema,
  }),
]);
export type ErrorSimProfile = z.infer<typeof ErrorSimProfileSchema>;

export type ErrorSimState = {
  readonly sequentialIndex: number;
};

export const initialErrorSimState: ErrorSimState = { sequentialIndex: 0 };

export type ErrorSimResult =
  | { readonly shouldError: false; readonly nextState: ErrorSimState }
  | { readonly shouldError: true; readonly errorResponse: MockResponse; readonly nextState: ErrorSimState };

export function evaluateErrorSim(
  profile: ErrorSimProfile,
  state: ErrorSimState,
): ErrorSimResult {
  switch (profile.kind) {
    case "none":
      return { shouldError: false, nextState: state };

    case "random": {
      const roll = Math.random();
      if (roll < profile.errorRate) {
        return { shouldError: true, errorResponse: profile.response, nextState: state };
      }
      return { shouldError: false, nextState: state };
    }

    case "circuit-open":
      return { shouldError: true, errorResponse: profile.response, nextState: state };

    case "timeout":
      return { shouldError: true, errorResponse: profile.response, nextState: state };

    case "sequential": {
      const idx = state.sequentialIndex % profile.pattern.length;
      const willError = profile.pattern[idx] ?? false;
      const nextState: ErrorSimState = { sequentialIndex: state.sequentialIndex + 1 };
      if (willError) {
        return { shouldError: true, errorResponse: profile.response, nextState };
      }
      return { shouldError: false, nextState };
    }
  }
}

export const ERROR_SIM_PRESETS = {
  none: { kind: "none" } satisfies ErrorSimProfile,
  alwaysFail503: {
    kind: "circuit-open",
    response: { status: 503, headers: {}, body: { error: "Service Unavailable" }, delay: 0 },
  } satisfies ErrorSimProfile,
  flaky20: {
    kind: "random",
    errorRate: 0.2,
    response: { status: 500, headers: {}, body: { error: "Internal Server Error" }, delay: 0 },
  } satisfies ErrorSimProfile,
  everyOther: {
    kind: "sequential",
    pattern: [false, true],
    response: { status: 500, headers: {}, body: { error: "Simulated failure" }, delay: 0 },
  } satisfies ErrorSimProfile,
} as const;
