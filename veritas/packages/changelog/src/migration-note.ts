// Represents structured migration notes attached to breaking changelog entries.
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { isoTimestampSchema } from "@veritas/core";
import type { Semver } from "./version.js";
import { semverSchema } from "./version.js";

export const migrationStepSchema = z.object({
  order: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  codeExample: z.string().optional(),
  required: z.boolean().default(true),
});

export type MigrationStep = Readonly<z.infer<typeof migrationStepSchema>>;

export const migrationNoteSchema = z.object({
  id: z.string().min(1),
  fromVersion: semverSchema,
  toVersion: semverSchema,
  title: z.string().min(1).max(300),
  overview: z.string().min(1).max(4000),
  steps: z.array(migrationStepSchema).min(1),
  estimatedEffort: z.enum(["trivial", "low", "medium", "high", "critical"]),
  affectedComponents: z.array(z.string()).default([]),
  entryIds: z.array(z.string()).default([]),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type MigrationNote = Readonly<z.infer<typeof migrationNoteSchema>>;

export const createMigrationNoteSchema = migrationNoteSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type CreateMigrationNote = Readonly<z.infer<typeof createMigrationNoteSchema>>;

export function makeMigrationNote(
  input: CreateMigrationNote,
  now: IsoTimestamp
): MigrationNote {
  return {
    ...input,
    steps: [...input.steps].sort((a, b) => a.order - b.order),
    affectedComponents: [...(input.affectedComponents ?? [])],
    entryIds: [...(input.entryIds ?? [])],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMigrationNote(
  note: MigrationNote,
  patch: Partial<Omit<MigrationNote, "id" | "fromVersion" | "toVersion" | "createdAt" | "updatedAt">>,
  now: IsoTimestamp
): MigrationNote {
  return {
    ...note,
    ...patch,
    steps: patch.steps
      ? [...patch.steps].sort((a, b) => a.order - b.order)
      : note.steps,
    id: note.id,
    fromVersion: note.fromVersion,
    toVersion: note.toVersion,
    createdAt: note.createdAt,
    updatedAt: now,
  };
}

export function migrationCoversVersions(
  note: MigrationNote,
  from: Semver,
  to: Semver
): boolean {
  return note.fromVersion === from && note.toVersion === to;
}
