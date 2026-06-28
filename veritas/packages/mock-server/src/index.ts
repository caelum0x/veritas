// Public surface of @veritas/mock-server — re-exports all modules.
export {
  HttpMethodSchema,
  MockResponseSchema,
  MockMatcherSchema,
  MockDefinitionSchema,
  createMock,
  incrementCallCount,
  isMockExhausted,
} from "./mock.js";
export type { HttpMethod, MockResponse, MockMatcher, MockDefinition, CreateMockDefinition } from "./mock.js";

export { matchesRequest } from "./matcher.js";
export type { IncomingRequest } from "./matcher.js";

export {
  MockNotFoundError,
  MockExhaustedError,
  MockAlreadyExistsError,
  MockValidationError,
  ScenarioNotFoundError,
} from "./errors.js";

export type {
  MatchResult,
  NoMatchResult,
  ResolveResult,
  ActiveScenario,
  LatencyOptions,
  ErrorSimOptions,
  RecordedCall,
  DynamicResponseFn,
  GeneratedMock,
} from "./types.js";

export type { Registry, ResolvedResponse, MatchRequest } from "./registry.js";
export {
  createRegistry,
  registerMock,
  unregisterMock,
  registerScenario,
  updateScenario,
  registerStatefulMock,
  getMock,
  getAllMocks,
  resetCallCounts,
  resolveRequest,
} from "./registry.js";

export type { Scenario, CreateScenario, ScenarioStore } from "./scenario.js";
export {
  createScenario,
  activateScenario,
  deactivateScenario,
  addMockToScenario,
  removeMockFromScenario,
  isScenarioActive,
  getActiveScenarioIds,
  mockBelongsToActiveScenario,
} from "./scenario.js";
