// In-memory store for onboarding flows and completion rewards.
import { type OnboardingFlow } from "./flow.js";
import { type CompletionReward } from "./completion.js";

export interface OnboardingStore {
  getFlow(flowId: string): OnboardingFlow | undefined;
  getFlowsByUser(userId: string): ReadonlyArray<OnboardingFlow>;
  saveFlow(flow: OnboardingFlow): void;
  deleteFlow(flowId: string): void;
  getRewardsByFlow(flowId: string): ReadonlyArray<CompletionReward>;
  saveRewards(rewards: ReadonlyArray<CompletionReward>): void;
}

export function createInMemoryOnboardingStore(): OnboardingStore {
  const flows = new Map<string, OnboardingFlow>();
  const rewards = new Map<string, CompletionReward[]>();

  function getFlow(flowId: string): OnboardingFlow | undefined {
    return flows.get(flowId);
  }

  function getFlowsByUser(userId: string): ReadonlyArray<OnboardingFlow> {
    return Array.from(flows.values()).filter((f) => f.userId === userId);
  }

  function saveFlow(flow: OnboardingFlow): void {
    flows.set(flow.id, flow);
  }

  function deleteFlow(flowId: string): void {
    flows.delete(flowId);
  }

  function getRewardsByFlow(flowId: string): ReadonlyArray<CompletionReward> {
    return rewards.get(flowId) ?? [];
  }

  function saveRewards(incoming: ReadonlyArray<CompletionReward>): void {
    for (const reward of incoming) {
      const existing = rewards.get(reward.flowId) ?? [];
      rewards.set(reward.flowId, [...existing, reward]);
    }
  }

  return { getFlow, getFlowsByUser, saveFlow, deleteFlow, getRewardsByFlow, saveRewards };
}
