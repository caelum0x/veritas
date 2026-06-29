// Experiment definition: core experiment entity with lifecycle management.

import { z } from "zod";
import { newId, type Id, type IsoTimestamp, asIsoTimestamp } from "@veritas/core";

export type ExperimentId = Id<"Experiment">;
export const newExperimentId = (): ExperimentId => newId("Experiment");

export const ExperimentStatusSchema = z.enum(["draft", "running", "paused", "completed", "archived"]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const ExperimentTypeSchema = z.enum(["ab", "multivariate", "holdout", "rollout"]);
export type ExperimentType = z.infer<typeof ExperimentTypeSchema>;

export const ExperimentSchema = z.object({
  id: z.string(),
  key: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  type: ExperimentTypeSchema,
  status: ExperimentStatusSchema,
  hypothesis: z.string().optional(),
  ownerTeam: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type Experiment = z.infer<typeof ExperimentSchema>;

export const CreateExperimentSchema = z.object({
  key: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  type: ExperimentTypeSchema.default("ab"),
  hypothesis: z.string().optional(),
  ownerTeam: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateExperiment = z.infer<typeof CreateExperimentSchema>;

export function makeExperiment(input: CreateExperiment): Experiment {
  const now = asIsoTimestamp(new Date().toISOString());
  return {
    id: newExperimentId(),
    key: input.key,
    name: input.name,
    description: input.description,
    type: input.type,
    status: "draft",
    hypothesis: input.hypothesis,
    ownerTeam: input.ownerTeam,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  };
}

export function startExperiment(experiment: Experiment): Experiment {
  const now = asIsoTimestamp(new Date().toISOString());
  return {
    ...experiment,
    status: "running",
    startedAt: now,
    updatedAt: now,
  };
}

export function pauseExperiment(experiment: Experiment): Experiment {
  const now = asIsoTimestamp(new Date().toISOString());
  return { ...experiment, status: "paused", updatedAt: now };
}

export function completeExperiment(experiment: Experiment): Experiment {
  const now = asIsoTimestamp(new Date().toISOString());
  return {
    ...experiment,
    status: "completed",
    endedAt: now,
    updatedAt: now,
  };
}

export function archiveExperiment(experiment: Experiment): Experiment {
  const now = asIsoTimestamp(new Date().toISOString());
  return { ...experiment, status: "archived", updatedAt: now };
}

export function isExperimentActive(experiment: Experiment): boolean {
  return experiment.status === "running";
}
