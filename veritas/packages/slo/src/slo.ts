// SLO definition: named service level objective binding an SLI to an objective target.
import { z } from "zod";
import { type Id, newId } from "@veritas/core";

export type SloId = Id<"Slo">;
export const newSloId = (): SloId => newId("Slo");

export const SloWindowKindSchema = z.enum(["rolling", "calendar"]);
export type SloWindowKind = z.infer<typeof SloWindowKindSchema>;

export const SloSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  sliName: z.string().min(1),
  targetRatio: z.number().min(0).max(1),
  windowDurationMs: z.number().int().positive(),
  windowKind: SloWindowKindSchema,
  tags: z.record(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Slo = z.infer<typeof SloSchema>;

export const CreateSloSchema = SloSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateSlo = z.infer<typeof CreateSloSchema>;

export function makeSlo(input: CreateSlo, now: string): Slo {
  return Object.freeze({
    ...input,
    id: newSloId() as string,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateSlo(slo: Slo, patch: Partial<CreateSlo>, now: string): Slo {
  return Object.freeze({ ...slo, ...patch, id: slo.id, createdAt: slo.createdAt, updatedAt: now });
}
