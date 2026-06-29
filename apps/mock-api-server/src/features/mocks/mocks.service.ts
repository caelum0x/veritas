// Mocks service: orchestrates registry mutations via @veritas/mock-server functions.
import {
  createMock,
  registerMock,
  unregisterMock,
  getMock,
  getAllMocks,
  resetCallCounts,
  resolveRequest,
  createScenario,
  registerScenario,
  updateScenario,
  activateScenario,
  deactivateScenario,
  addMockToScenario,
  removeMockFromScenario,
  MockAlreadyExistsError,
  MockNotFoundError,
  ScenarioNotFoundError,
  type MockDefinition,
  type Scenario,
  type ResolvedResponse,
  type MatchRequest,
} from "@veritas/mock-server";
import type { Deps } from "../../container.js";
import type { CreateMockBody, UpdateMockBody, CreateScenarioBody } from "./mocks.schema.js";

export type MocksService = {
  createMock(body: CreateMockBody): MockDefinition;
  getMock(mockId: string): MockDefinition;
  listMocks(): ReadonlyArray<MockDefinition>;
  updateMock(mockId: string, body: UpdateMockBody): MockDefinition;
  deleteMock(mockId: string): void;
  resetCounts(): void;
  resolveRequest(req: MatchRequest): Promise<ResolvedResponse>;
  createScenario(body: CreateScenarioBody): Scenario;
  getScenario(scenarioId: string): Scenario;
  listScenarios(): ReadonlyArray<Scenario>;
  activateScenario(scenarioId: string): Scenario;
  deactivateScenario(scenarioId: string): Scenario;
  addMockToScenario(scenarioId: string, mockId: string): Scenario;
  removeMockFromScenario(scenarioId: string, mockId: string): Scenario;
};

export function createMocksService(deps: Deps): MocksService {
  const { registryRef, logger } = deps;

  function getRegScenario(scenarioId: string): Scenario {
    const s = registryRef.current.scenarios.get(scenarioId);
    if (!s) throw new ScenarioNotFoundError(scenarioId);
    return s;
  }

  return {
    createMock(body) {
      const existing = getMock(registryRef.current, body.id);
      if (existing) throw new MockAlreadyExistsError(body.id);

      const def = createMock({
        id: body.id,
        name: body.name,
        matcher: body.matcher,
        response: body.response,
        priority: body.priority ?? 0,
        enabled: body.enabled ?? true,
        ...(body.scenarioId !== undefined ? { scenarioId: body.scenarioId } : {}),
        ...(body.maxCalls !== undefined ? { maxCalls: body.maxCalls } : {}),
      });

      registryRef.current = registerMock(registryRef.current, def);
      logger.info("Mock registered", { mockId: def.id });
      return def;
    },

    getMock(mockId) {
      const mock = getMock(registryRef.current, mockId);
      if (!mock) throw new MockNotFoundError("*", mockId);
      return mock;
    },

    listMocks() {
      return getAllMocks(registryRef.current);
    },

    updateMock(mockId, body) {
      const existing = getMock(registryRef.current, mockId);
      if (!existing) throw new MockNotFoundError("*", mockId);

      const updated: MockDefinition = {
        ...existing,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.matcher !== undefined ? { matcher: body.matcher } : {}),
        ...(body.response !== undefined ? { response: body.response } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.maxCalls !== undefined ? { maxCalls: body.maxCalls } : {}),
      };

      registryRef.current = unregisterMock(registryRef.current, mockId);
      registryRef.current = registerMock(registryRef.current, updated);
      logger.info("Mock updated", { mockId });
      return updated;
    },

    deleteMock(mockId) {
      const existing = getMock(registryRef.current, mockId);
      if (!existing) throw new MockNotFoundError("*", mockId);
      registryRef.current = unregisterMock(registryRef.current, mockId);
      logger.info("Mock deleted", { mockId });
    },

    resetCounts() {
      registryRef.current = resetCallCounts(registryRef.current);
      logger.info("Mock call counts reset");
    },

    async resolveRequest(req) {
      const { response, nextRegistry } = await resolveRequest(registryRef.current, req);
      registryRef.current = nextRegistry;
      return response;
    },

    createScenario(body) {
      const existing = registryRef.current.scenarios.get(body.id);
      if (existing) throw new MockAlreadyExistsError(body.id);

      const scenario = createScenario({
        id: body.id,
        name: body.name,
        ...(body.description !== undefined ? { description: body.description } : {}),
        active: body.active ?? false,
        mockIds: body.mockIds ?? [],
      });

      registryRef.current = registerScenario(registryRef.current, scenario);
      logger.info("Scenario created", { scenarioId: scenario.id });
      return scenario;
    },

    getScenario(scenarioId) {
      return getRegScenario(scenarioId);
    },

    listScenarios() {
      return Array.from(registryRef.current.scenarios.values());
    },

    activateScenario(scenarioId) {
      const scenario = getRegScenario(scenarioId);
      const updated = activateScenario(scenario);
      registryRef.current = updateScenario(registryRef.current, updated);
      logger.info("Scenario activated", { scenarioId });
      return updated;
    },

    deactivateScenario(scenarioId) {
      const scenario = getRegScenario(scenarioId);
      const updated = deactivateScenario(scenario);
      registryRef.current = updateScenario(registryRef.current, updated);
      logger.info("Scenario deactivated", { scenarioId });
      return updated;
    },

    addMockToScenario(scenarioId, mockId) {
      const scenario = getRegScenario(scenarioId);
      const updated = addMockToScenario(scenario, mockId);
      registryRef.current = updateScenario(registryRef.current, updated);
      return updated;
    },

    removeMockFromScenario(scenarioId, mockId) {
      const scenario = getRegScenario(scenarioId);
      const updated = removeMockFromScenario(scenario, mockId);
      registryRef.current = updateScenario(registryRef.current, updated);
      return updated;
    },
  };
}
