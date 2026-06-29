// Checklist aggregates required and optional step statuses for user display.
import { z } from "zod";
import { type OnboardingFlow } from "./flow.js";
import { type OnboardingStep, isStepDone } from "./step.js";

export const ChecklistItemSchema = z.object({
  stepId: z.string(),
  kind: z.string(),
  title: z.string(),
  description: z.string(),
  required: z.boolean(),
  skippable: z.boolean(),
  done: z.boolean(),
  status: z.string(),
  order: z.number(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  flowId: z.string(),
  flowName: z.string(),
  items: z.array(ChecklistItemSchema),
  requiredTotal: z.number(),
  requiredDone: z.number(),
  optionalTotal: z.number(),
  optionalDone: z.number(),
  percentComplete: z.number(),
  allRequiredDone: z.boolean(),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

function stepToItem(step: OnboardingStep): ChecklistItem {
  return {
    stepId: step.id,
    kind: step.kind,
    title: step.title,
    description: step.description,
    required: step.required,
    skippable: step.skippable,
    done: isStepDone(step),
    status: step.status,
    order: step.order,
  };
}

export function buildChecklist(flow: OnboardingFlow): Checklist {
  const items = [...flow.steps]
    .sort((a, b) => a.order - b.order)
    .map(stepToItem);

  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const requiredDone = required.filter((i) => i.done).length;
  const optionalDone = optional.filter((i) => i.done).length;
  const total = items.length;
  const totalDone = items.filter((i) => i.done).length;
  const percentComplete = total === 0 ? 0 : Math.round((totalDone / total) * 100);
  const allRequiredDone = required.length > 0 && requiredDone === required.length;

  return {
    flowId: flow.id,
    flowName: flow.name,
    items,
    requiredTotal: required.length,
    requiredDone,
    optionalTotal: optional.length,
    optionalDone,
    percentComplete,
    allRequiredDone,
  };
}

export function pendingRequiredItems(checklist: Checklist): ChecklistItem[] {
  return checklist.items.filter((i) => i.required && !i.done);
}

export function nextChecklistItem(checklist: Checklist): ChecklistItem | null {
  const pending = checklist.items.filter((i) => !i.done).sort((a, b) => a.order - b.order);
  return pending[0] ?? null;
}
