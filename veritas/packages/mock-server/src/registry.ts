// Central registry holding all mocks, scenarios, stateful mocks and their runtime state.
import { type MockDefinition, incrementCallCount, isMockExhausted } from "./mock.js";
import { type Scenario, type ScenarioStore, mockBelongsToActiveScenario } from "./scenario.js";
import { type StatefulMock, resolveStatefulResponse } from "./stateful.js";
import { type LatencyProfile, applyLatency } from "./latency-sim.js";
import { type ErrorSimProfile, type ErrorSimState, initialErrorSimState, evaluateErrorSim } from "./error-sim.js";
import { type MockResponse } from "./mock.js";

export type ResolvedResponse =
  | { readonly kind: "match"; readonly response: MockResponse; readonly mockId: string }
  | { readonly kind: "no-match" }
  | { readonly kind: "error"; readonly response: MockResponse; readonly mockId: string };

type RegistryEntry = {
  readonly mock: MockDefinition;
  readonly latency: LatencyProfile;
  readonly errorSim: ErrorSimProfile;
  readonly errorSimState: ErrorSimState;
};

export type Registry = {
  readonly entries: ReadonlyMap<string, RegistryEntry>;
  readonly scenarios: ScenarioStore;
  readonly statefulMocks: ReadonlyMap<string, StatefulMock>;
};

export function createRegistry(): Registry {
  return {
    entries: new Map(),
    scenarios: new Map(),
    statefulMocks: new Map(),
  };
}

export function registerMock(
  registry: Registry,
  mock: MockDefinition,
  latency: LatencyProfile = { kind: "none" },
  errorSim: ErrorSimProfile = { kind: "none" },
): Registry {
  const entry: RegistryEntry = { mock, latency, errorSim, errorSimState: initialErrorSimState };
  return {
    ...registry,
    entries: new Map([...registry.entries, [mock.id, entry]]),
  };
}

export function unregisterMock(registry: Registry, mockId: string): Registry {
  const next = new Map(registry.entries);
  next.delete(mockId);
  return { ...registry, entries: next };
}

export function registerScenario(registry: Registry, scenario: Scenario): Registry {
  return {
    ...registry,
    scenarios: new Map([...registry.scenarios, [scenario.id, scenario]]),
  };
}

export function updateScenario(registry: Registry, scenario: Scenario): Registry {
  return registerScenario(registry, scenario);
}

export function registerStatefulMock(registry: Registry, sm: StatefulMock): Registry {
  return {
    ...registry,
    statefulMocks: new Map([...registry.statefulMocks, [sm.mockId, sm]]),
  };
}

export function getMock(registry: Registry, mockId: string): MockDefinition | undefined {
  return registry.entries.get(mockId)?.mock;
}

export function getAllMocks(registry: Registry): ReadonlyArray<MockDefinition> {
  return Array.from(registry.entries.values()).map((e) => e.mock);
}

export function resetCallCounts(registry: Registry): Registry {
  const next = new Map<string, RegistryEntry>();
  for (const [id, entry] of registry.entries) {
    next.set(id, { ...entry, mock: { ...entry.mock, callCount: 0 } });
  }
  return { ...registry, entries: next };
}

export type MatchRequest = {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
};

function matchesMatcher(mock: MockDefinition, req: MatchRequest): boolean {
  const m = mock.matcher;
  if (m.method && m.method !== req.method.toUpperCase()) return false;
  if (m.pathIsRegex) {
    if (!new RegExp(m.path).test(req.path)) return false;
  } else {
    if (m.path !== req.path) return false;
  }
  if (m.query) {
    for (const [k, v] of Object.entries(m.query)) {
      if (req.query[k] !== v) return false;
    }
  }
  if (m.headers) {
    for (const [k, v] of Object.entries(m.headers)) {
      if (req.headers[k.toLowerCase()] !== v) return false;
    }
  }
  if (m.bodyContains && typeof req.body === "object" && req.body !== null) {
    for (const [k, v] of Object.entries(m.bodyContains)) {
      if ((req.body as Record<string, unknown>)[k] !== v) return false;
    }
  }
  return true;
}

export async function resolveRequest(
  registry: Registry,
  req: MatchRequest,
): Promise<{ response: ResolvedResponse; nextRegistry: Registry }> {
  const candidates = Array.from(registry.entries.values())
    .filter((e) => e.mock.enabled && !isMockExhausted(e.mock))
    .filter((e) => mockBelongsToActiveScenario(e.mock.id, e.mock.scenarioId, registry.scenarios))
    .filter((e) => matchesMatcher(e.mock, req))
    .sort((a, b) => b.mock.priority - a.mock.priority);

  if (candidates.length === 0) {
    return { response: { kind: "no-match" }, nextRegistry: registry };
  }

  const selected = candidates[0]!;
  const { mock, latency, errorSim, errorSimState } = selected;

  const errResult = evaluateErrorSim(errorSim, errorSimState);
  const nextEntries = new Map(registry.entries);
  const nextErrorSimState = errResult.nextState;

  if (errResult.shouldError) {
    await applyLatency(latency);
    nextEntries.set(mock.id, { ...selected, errorSimState: nextErrorSimState });
    const nextRegistry: Registry = { ...registry, entries: nextEntries };
    return {
      response: { kind: "error", response: errResult.errorResponse, mockId: mock.id },
      nextRegistry,
    };
  }

  await applyLatency(latency);

  const statefulMock = registry.statefulMocks.get(mock.id);
  let finalResponse: MockResponse;
  let nextStatefulMocks = registry.statefulMocks;

  if (statefulMock) {
    const { response, next } = resolveStatefulResponse(statefulMock);
    finalResponse = response;
    nextStatefulMocks = new Map([...registry.statefulMocks, [mock.id, next]]);
  } else {
    finalResponse = mock.response;
  }

  const updatedMock = incrementCallCount(mock);
  nextEntries.set(mock.id, { ...selected, mock: updatedMock, errorSimState: nextErrorSimState });

  const nextRegistry: Registry = {
    ...registry,
    entries: nextEntries,
    statefulMocks: nextStatefulMocks,
  };

  return {
    response: { kind: "match", response: finalResponse, mockId: mock.id },
    nextRegistry,
  };
}
