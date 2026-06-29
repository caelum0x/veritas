// Selects the best matching mock and builds the HTTP response descriptor.
import { type MockDefinition, incrementCallCount, isMockExhausted } from "./mock.js";
import { matchesRequest, type IncomingRequest } from "./matcher.js";
import type { MockResponse } from "./mock.js";

export interface ResponderResult {
  readonly matched: boolean;
  readonly response: MockResponse | null;
  readonly matchedMock: MockDefinition | null;
  readonly updatedMock: MockDefinition | null;
}

function selectBestMatch(
  mocks: readonly MockDefinition[],
  req: IncomingRequest,
): MockDefinition | null {
  const candidates = mocks
    .filter((m) => m.enabled && !isMockExhausted(m))
    .filter((m) => matchesRequest(m.matcher, req))
    .sort((a, b) => b.priority - a.priority);

  return candidates[0] ?? null;
}

export function respond(
  mocks: readonly MockDefinition[],
  req: IncomingRequest,
): ResponderResult {
  const matched = selectBestMatch(mocks, req);
  if (!matched) {
    return { matched: false, response: null, matchedMock: null, updatedMock: null };
  }
  const updatedMock = incrementCallCount(matched);
  return {
    matched: true,
    response: matched.response,
    matchedMock: matched,
    updatedMock,
  };
}

export function buildDefaultFallback(): MockResponse {
  return {
    status: 404,
    headers: { "content-type": "application/json" },
    body: {
      success: false,
      data: null,
      error: { code: "NOT_FOUND", message: "No mock matched this request" },
    },
    delay: 0,
  };
}
