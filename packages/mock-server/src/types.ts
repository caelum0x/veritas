// Shared type aliases and utility types used across mock-server internals.
import type { MockDefinition, MockResponse } from "./mock.js";
import type { IncomingRequest } from "./matcher.js";

/** Result of attempting to resolve an incoming request against the mock registry. */
export interface MatchResult {
  readonly matched: true;
  readonly mock: MockDefinition;
  readonly response: MockResponse;
}

export interface NoMatchResult {
  readonly matched: false;
}

export type ResolveResult = MatchResult | NoMatchResult;

/** An active scenario that gates which mocks are eligible. */
export interface ActiveScenario {
  readonly scenarioId: string;
  readonly activatedAt: string; // ISO timestamp
}

/** Options controlling latency simulation behaviour. */
export interface LatencyOptions {
  readonly minMs: number;
  readonly maxMs: number;
  readonly p99Ms?: number;
}

/** Options controlling error simulation behaviour. */
export interface ErrorSimOptions {
  /** Fraction of requests (0–1) that should be forced to fail. */
  readonly errorRate: number;
  /** HTTP status code to return on simulated error. */
  readonly errorStatus: number;
  /** Optional body to return on simulated error. */
  readonly errorBody?: unknown;
}

/** A recorded interaction for introspection / assertion in tests. */
export interface RecordedCall {
  readonly mockId: string;
  readonly request: IncomingRequest;
  readonly response: MockResponse;
  readonly calledAt: string; // ISO timestamp
  readonly latencyMs: number;
}

/** Callback type used by stateful mock handlers to compute a dynamic response. */
export type DynamicResponseFn = (
  req: IncomingRequest,
  state: Readonly<Record<string, unknown>>,
) => MockResponse | Promise<MockResponse>;

/** Descriptor returned by the mock generator for a single contract endpoint. */
export interface GeneratedMock {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly definition: MockDefinition;
}
