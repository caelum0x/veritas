// Manages named scenarios that group mock definitions for toggling test states.
import { z } from "zod";

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  active: z.boolean().default(false),
  mockIds: z.array(z.string()).default([]),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export type CreateScenario = Omit<Scenario, "active" | "mockIds"> & {
  active?: boolean;
  mockIds?: string[];
};

export type ScenarioStore = Readonly<Map<string, Scenario>>;

export function createScenario(def: CreateScenario): Scenario {
  return ScenarioSchema.parse({ active: false, mockIds: [], ...def });
}

export function activateScenario(scenario: Scenario): Scenario {
  return { ...scenario, active: true };
}

export function deactivateScenario(scenario: Scenario): Scenario {
  return { ...scenario, active: false };
}

export function addMockToScenario(scenario: Scenario, mockId: string): Scenario {
  if (scenario.mockIds.includes(mockId)) return scenario;
  return { ...scenario, mockIds: [...scenario.mockIds, mockId] };
}

export function removeMockFromScenario(scenario: Scenario, mockId: string): Scenario {
  return { ...scenario, mockIds: scenario.mockIds.filter((id) => id !== mockId) };
}

export function isScenarioActive(scenario: Scenario): boolean {
  return scenario.active;
}

export function getActiveScenarioIds(store: ScenarioStore): ReadonlyArray<string> {
  const ids: string[] = [];
  for (const [id, scenario] of store) {
    if (scenario.active) ids.push(id);
  }
  return ids;
}

export function mockBelongsToActiveScenario(
  mockId: string,
  scenarioId: string | undefined,
  store: ScenarioStore,
): boolean {
  if (scenarioId === undefined) return true;
  const scenario = store.get(scenarioId);
  if (!scenario) return false;
  return scenario.active && scenario.mockIds.includes(mockId);
}
