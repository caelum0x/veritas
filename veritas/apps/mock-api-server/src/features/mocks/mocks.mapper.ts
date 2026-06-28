// Maps @veritas/mock-server domain types to HTTP response DTOs.
import type { MockDefinition } from "@veritas/mock-server";
import type { Scenario } from "@veritas/mock-server";

export type MockDto = {
  readonly id: string;
  readonly name: string;
  readonly matcher: MockDefinition["matcher"];
  readonly response: MockDefinition["response"];
  readonly priority: number;
  readonly enabled: boolean;
  readonly scenarioId?: string;
  readonly callCount: number;
  readonly maxCalls?: number;
};

export type ScenarioDto = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly active: boolean;
  readonly mockIds: readonly string[];
};

export function mockToDto(mock: MockDefinition): MockDto {
  return {
    id: mock.id,
    name: mock.name,
    matcher: mock.matcher,
    response: mock.response,
    priority: mock.priority,
    enabled: mock.enabled,
    ...(mock.scenarioId !== undefined ? { scenarioId: mock.scenarioId } : {}),
    callCount: mock.callCount,
    ...(mock.maxCalls !== undefined ? { maxCalls: mock.maxCalls } : {}),
  };
}

export function scenarioToDto(scenario: Scenario): ScenarioDto {
  return {
    id: scenario.id,
    name: scenario.name,
    ...(scenario.description !== undefined ? { description: scenario.description } : {}),
    active: scenario.active,
    mockIds: scenario.mockIds,
  };
}
