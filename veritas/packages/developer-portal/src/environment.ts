// Developer portal environments — isolated runtime contexts for developer apps
import { z } from "zod";
import { newId, type IsoTimestamp } from "@veritas/core";
import { nonEmptyString, metadataSchema, timestampsSchema } from "@veritas/contracts";

export const EnvTierSchema = z.enum(["development", "staging", "production"]);
export type EnvTier = z.infer<typeof EnvTierSchema>;

export const EnvStatusSchema = z.enum(["active", "archived"]);
export type EnvStatus = z.infer<typeof EnvStatusSchema>;

export const EnvironmentVariableSchema = z.object({
  key: nonEmptyString,
  value: z.string(),
  secret: z.boolean().default(false),
});

export type EnvironmentVariable = z.infer<typeof EnvironmentVariableSchema>;

export const AppEnvironmentSchema = z.object({
  id: z.string(),
  appId: z.string(),
  name: nonEmptyString,
  tier: EnvTierSchema,
  status: EnvStatusSchema,
  variables: z.array(EnvironmentVariableSchema).default([]),
  metadata: metadataSchema,
  timestamps: timestampsSchema,
});

export type AppEnvironment = z.infer<typeof AppEnvironmentSchema>;

export const CreateAppEnvironmentSchema = AppEnvironmentSchema.omit({
  id: true,
  status: true,
  timestamps: true,
}).extend({
  variables: z.array(EnvironmentVariableSchema).default([]),
  metadata: metadataSchema.default({}),
});

export type CreateAppEnvironment = z.infer<typeof CreateAppEnvironmentSchema>;

export const UpdateAppEnvironmentSchema = z.object({
  name: nonEmptyString.optional(),
  variables: z.array(EnvironmentVariableSchema).optional(),
  metadata: metadataSchema.optional(),
});

export type UpdateAppEnvironment = z.infer<typeof UpdateAppEnvironmentSchema>;

export function createAppEnvironment(input: CreateAppEnvironment, now: IsoTimestamp): AppEnvironment {
  return {
    ...input,
    id: newId("env"),
    status: "active",
    timestamps: { createdAt: now, updatedAt: now },
  };
}

export function updateAppEnvironment(env: AppEnvironment, patch: UpdateAppEnvironment, now: IsoTimestamp): AppEnvironment {
  return { ...env, ...patch, timestamps: { ...env.timestamps, updatedAt: now } };
}

export function archiveEnvironment(env: AppEnvironment, now: IsoTimestamp): AppEnvironment {
  return { ...env, status: "archived", timestamps: { ...env.timestamps, updatedAt: now } };
}

export function setVariable(env: AppEnvironment, variable: EnvironmentVariable, now: IsoTimestamp): AppEnvironment {
  const filtered = env.variables.filter((v) => v.key !== variable.key);
  return { ...env, variables: [...filtered, variable], timestamps: { ...env.timestamps, updatedAt: now } };
}

export function removeVariable(env: AppEnvironment, key: string, now: IsoTimestamp): AppEnvironment {
  return { ...env, variables: env.variables.filter((v) => v.key !== key), timestamps: { ...env.timestamps, updatedAt: now } };
}

export function maskSecrets(env: AppEnvironment): AppEnvironment {
  return {
    ...env,
    variables: env.variables.map((v) => (v.secret ? { ...v, value: "***" } : v)),
  };
}
