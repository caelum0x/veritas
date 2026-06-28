// Developer portal application entity — represents a registered developer app
import { z } from "zod";
import { newId, type IsoTimestamp } from "@veritas/core";
import { nonEmptyString, urlSchema, metadataSchema, timestampsSchema } from "@veritas/contracts";

export const AppEnvironmentSchema = z.enum(["development", "staging", "production"]);
export type AppEnvironment = z.infer<typeof AppEnvironmentSchema>;

export const AppStatusSchema = z.enum(["active", "suspended", "deleted"]);
export type AppStatus = z.infer<typeof AppStatusSchema>;

export const DeveloperAppSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  ownerId: z.string(),
  name: nonEmptyString,
  description: z.string().max(500).optional(),
  websiteUrl: urlSchema.optional(),
  logoUrl: urlSchema.optional(),
  environments: z.array(AppEnvironmentSchema).min(1),
  status: AppStatusSchema,
  metadata: metadataSchema,
  timestamps: timestampsSchema,
});

export type DeveloperApp = z.infer<typeof DeveloperAppSchema>;

export const CreateDeveloperAppSchema = DeveloperAppSchema.omit({
  id: true,
  status: true,
  timestamps: true,
}).extend({
  environments: z.array(AppEnvironmentSchema).min(1).default(["development"]),
  metadata: metadataSchema.default({}),
});

export type CreateDeveloperApp = z.infer<typeof CreateDeveloperAppSchema>;

export const UpdateDeveloperAppSchema = DeveloperAppSchema
  .pick({ name: true, description: true, websiteUrl: true, logoUrl: true, environments: true, metadata: true })
  .partial();

export type UpdateDeveloperApp = z.infer<typeof UpdateDeveloperAppSchema>;

export function createDeveloperApp(input: CreateDeveloperApp, now: IsoTimestamp): DeveloperApp {
  return {
    ...input,
    id: newId("app"),
    status: "active",
    timestamps: { createdAt: now, updatedAt: now },
  };
}

export function suspendApp(app: DeveloperApp, now: IsoTimestamp): DeveloperApp {
  return { ...app, status: "suspended", timestamps: { ...app.timestamps, updatedAt: now } };
}

export function activateApp(app: DeveloperApp, now: IsoTimestamp): DeveloperApp {
  return { ...app, status: "active", timestamps: { ...app.timestamps, updatedAt: now } };
}

export function deleteApp(app: DeveloperApp, now: IsoTimestamp): DeveloperApp {
  return { ...app, status: "deleted", timestamps: { ...app.timestamps, updatedAt: now } };
}

export function updateApp(app: DeveloperApp, patch: UpdateDeveloperApp, now: IsoTimestamp): DeveloperApp {
  return { ...app, ...patch, timestamps: { ...app.timestamps, updatedAt: now } };
}
