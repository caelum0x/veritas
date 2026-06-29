// In-memory store for lifecycle journeys, stage configs, and transitions.
import { type LifecycleJourney } from "./journey.js";
import { type LifecycleStage, type StageConfig } from "./stage.js";
import { type Transition, type TransitionKey } from "./transition.js";

export interface LifecycleStore {
  // Journeys
  getJourney(journeyId: string): LifecycleJourney | undefined;
  getJourneyBySubject(subjectKind: string, subjectId: string): LifecycleJourney | undefined;
  saveJourney(journey: LifecycleJourney): void;
  deleteJourney(journeyId: string): void;
  listJourneys(): ReadonlyArray<LifecycleJourney>;

  // Stage configs (supplemental/overrideable)
  getStageConfig(stage: LifecycleStage): StageConfig | undefined;
  saveStageConfig(config: StageConfig): void;
  listStageConfigs(): ReadonlyArray<StageConfig>;

  // Transition overrides (supplemental to the built-in allowed set)
  getTransitionOverride(key: TransitionKey): Transition | undefined;
  saveTransitionOverride(transition: Transition): void;
  listTransitionOverrides(): ReadonlyArray<Transition>;
  transitionOverridesFrom(stage: LifecycleStage): ReadonlyArray<Transition>;
}

export function createInMemoryLifecycleStore(): LifecycleStore {
  const journeys = new Map<string, LifecycleJourney>();
  const stageConfigs = new Map<LifecycleStage, StageConfig>();
  const transitionOverrides = new Map<TransitionKey, Transition>();

  function getJourney(journeyId: string): LifecycleJourney | undefined {
    return journeys.get(journeyId);
  }

  function getJourneyBySubject(
    subjectKind: string,
    subjectId: string,
  ): LifecycleJourney | undefined {
    for (const j of journeys.values()) {
      if (j.subject.kind === subjectKind && j.subject.id === subjectId) return j;
    }
    return undefined;
  }

  function saveJourney(journey: LifecycleJourney): void {
    journeys.set(journey.id, journey);
  }

  function deleteJourney(journeyId: string): void {
    journeys.delete(journeyId);
  }

  function listJourneys(): ReadonlyArray<LifecycleJourney> {
    return Array.from(journeys.values());
  }

  function getStageConfig(stage: LifecycleStage): StageConfig | undefined {
    return stageConfigs.get(stage);
  }

  function saveStageConfig(config: StageConfig): void {
    stageConfigs.set(config.stage, config);
  }

  function listStageConfigs(): ReadonlyArray<StageConfig> {
    return Array.from(stageConfigs.values());
  }

  function getTransitionOverride(key: TransitionKey): Transition | undefined {
    return transitionOverrides.get(key);
  }

  function saveTransitionOverride(transition: Transition): void {
    const key: TransitionKey = `${transition.from}->${transition.to}`;
    transitionOverrides.set(key, transition);
  }

  function listTransitionOverrides(): ReadonlyArray<Transition> {
    return Array.from(transitionOverrides.values());
  }

  function transitionOverridesFrom(stage: LifecycleStage): ReadonlyArray<Transition> {
    return Array.from(transitionOverrides.values()).filter((t) => t.from === stage);
  }

  return {
    getJourney,
    getJourneyBySubject,
    saveJourney,
    deleteJourney,
    listJourneys,
    getStageConfig,
    saveStageConfig,
    listStageConfigs,
    getTransitionOverride,
    saveTransitionOverride,
    listTransitionOverrides,
    transitionOverridesFrom,
  };
}
