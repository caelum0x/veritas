// Defines the SecretRef value object — a typed pointer to a named secret with optional version.
import { z } from "zod";
import { Brand, brand, unbrand } from "@veritas/core";

export type SecretName = Brand<string, "SecretName">;
export type SecretVersion = Brand<string, "SecretVersion">;
export type SecretValue = Brand<string, "SecretValue">;

export function secretName(raw: string): SecretName {
  if (!raw || !/^[a-zA-Z0-9_/-]{1,256}$/.test(raw)) {
    throw new Error(`Invalid secret name: ${raw}`);
  }
  return brand<string, "SecretName">(raw);
}

export function secretVersion(raw: string): SecretVersion {
  return brand<string, "SecretVersion">(raw);
}

export function secretValue(raw: string): SecretValue {
  return brand<string, "SecretValue">(raw);
}

export const SecretRefSchema = z.object({
  name: z.string().min(1).max(256).regex(/^[a-zA-Z0-9_/-]+$/),
  version: z.string().optional(),
  description: z.string().optional(),
});

export type SecretRef = z.infer<typeof SecretRefSchema>;

export function makeSecretRef(name: string, version?: string, description?: string): SecretRef {
  return SecretRefSchema.parse({ name, version, description });
}

export const SecretMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  tags: z.record(z.string()).optional(),
  rotationEnabled: z.boolean().default(false),
});

export type SecretMetadata = z.infer<typeof SecretMetadataSchema>;

export const ResolvedSecretSchema = z.object({
  ref: SecretRefSchema,
  value: z.string(),
  metadata: SecretMetadataSchema,
});

export type ResolvedSecret = z.infer<typeof ResolvedSecretSchema>;

export function toSecretNameStr(n: SecretName): string {
  return unbrand(n);
}

export function toSecretVersionStr(v: SecretVersion): string {
  return unbrand(v);
}

export function toSecretValueStr(v: SecretValue): string {
  return unbrand(v);
}
