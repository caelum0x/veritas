// Provides stateful mock behavior: sequenced responses and call-count-based state transitions.
import { z } from "zod";
import { MockResponseSchema, type MockResponse } from "./mock.js";

export const StatefulResponseSchema = z.object({
  response: MockResponseSchema,
  times: z.number().int().min(1).default(1),
});
export type StatefulResponse = z.infer<typeof StatefulResponseSchema>;

export const StatefulMockSchema = z.object({
  id: z.string(),
  mockId: z.string(),
  sequence: z.array(StatefulResponseSchema).min(1),
  currentIndex: z.number().int().min(0).default(0),
  repeatLast: z.boolean().default(true),
  callsAtIndex: z.number().int().min(0).default(0),
});
export type StatefulMock = z.infer<typeof StatefulMockSchema>;

export type CreateStatefulMock = Omit<StatefulMock, "currentIndex" | "callsAtIndex"> & {
  currentIndex?: number;
  callsAtIndex?: number;
};

export function createStatefulMock(def: CreateStatefulMock): StatefulMock {
  return StatefulMockSchema.parse({ currentIndex: 0, callsAtIndex: 0, ...def });
}

export function resolveStatefulResponse(
  sm: StatefulMock,
): { response: MockResponse; next: StatefulMock } {
  const clampedIndex = Math.min(sm.currentIndex, sm.sequence.length - 1);
  const entry = sm.sequence[clampedIndex];
  if (!entry) throw new Error(`StatefulMock ${sm.id}: empty sequence`);

  const nextCallsAtIndex = sm.callsAtIndex + 1;
  const shouldAdvance = nextCallsAtIndex >= entry.times;
  const atLast = clampedIndex >= sm.sequence.length - 1;

  let nextIndex: number;
  let nextCallsAtIndexValue: number;

  if (shouldAdvance) {
    if (atLast && sm.repeatLast) {
      nextIndex = clampedIndex;
    } else if (atLast) {
      nextIndex = clampedIndex;
    } else {
      nextIndex = clampedIndex + 1;
    }
    nextCallsAtIndexValue = 0;
  } else {
    nextIndex = clampedIndex;
    nextCallsAtIndexValue = nextCallsAtIndex;
  }

  return {
    response: entry.response,
    next: { ...sm, currentIndex: nextIndex, callsAtIndex: nextCallsAtIndexValue },
  };
}

export function resetStatefulMock(sm: StatefulMock): StatefulMock {
  return { ...sm, currentIndex: 0, callsAtIndex: 0 };
}

export function isStatefulMockComplete(sm: StatefulMock): boolean {
  if (sm.repeatLast) return false;
  const atLast = sm.currentIndex >= sm.sequence.length - 1;
  const entry = sm.sequence[sm.currentIndex];
  if (!entry) return true;
  return atLast && sm.callsAtIndex >= entry.times;
}
