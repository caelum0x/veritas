// Credential schema definitions and validation per W3C VC Data Model credentialSchema property.
import { z } from "zod";
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";

export class CredentialSchemaError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "CredentialSchemaError";
  }
}

/** Supported credential schema types. */
export type CredentialSchemaType = "JsonSchemaValidator2018" | "JsonSchema2023";

/** Reference to a credential schema embedded in a VC. */
export interface CredentialSchemaRef {
  readonly id: string;
  readonly type: CredentialSchemaType;
}

/** Full credential schema document. */
export interface CredentialSchema {
  readonly id: string;
  readonly type: CredentialSchemaType;
  readonly name?: string;
  readonly description?: string;
  readonly jsonSchema: Record<string, unknown>;
}

const credentialSchemaRefSchema = z.object({
  id: z.string().url(),
  type: z.enum(["JsonSchemaValidator2018", "JsonSchema2023"]),
});

const credentialSchemaSchema = z.object({
  id: z.string().url(),
  type: z.enum(["JsonSchemaValidator2018", "JsonSchema2023"]),
  name: z.string().optional(),
  description: z.string().optional(),
  jsonSchema: z.record(z.unknown()),
});

/** Parse and validate a raw credential schema reference. */
export function parseCredentialSchemaRef(raw: unknown): Result<CredentialSchemaRef, CredentialSchemaError> {
  const result = credentialSchemaRefSchema.safeParse(raw);
  if (!result.success) {
    return err(new CredentialSchemaError("Invalid schema ref: " + result.error.message));
  }
  return ok(Object.freeze(result.data) as CredentialSchemaRef);
}

/** Parse and validate a full credential schema document. */
export function parseCredentialSchema(raw: unknown): Result<CredentialSchema, CredentialSchemaError> {
  const result = credentialSchemaSchema.safeParse(raw);
  if (!result.success) {
    return err(new CredentialSchemaError("Invalid credential schema: " + result.error.message));
  }
  return ok(Object.freeze(result.data) as CredentialSchema);
}

/** Validate a credential subject against a JSON schema (structural, no $ref resolution). */
export function validateSubjectAgainstSchema(
  subject: Record<string, unknown>,
  schema: CredentialSchema,
): Result<true, CredentialSchemaError> {
  const { jsonSchema } = schema;
  const type = jsonSchema["type"];
  if (type !== undefined && type !== "object") {
    return err(new CredentialSchemaError(`Schema root type must be 'object', got '${String(type)}'`));
  }

  const required = jsonSchema["required"];
  if (Array.isArray(required)) {
    for (const key of required) {
      if (typeof key === "string" && !(key in subject)) {
        return err(new CredentialSchemaError(`Missing required field: ${key}`));
      }
    }
  }

  const properties = jsonSchema["properties"];
  if (properties !== null && typeof properties === "object" && !Array.isArray(properties)) {
    const props = properties as Record<string, unknown>;
    for (const [field, spec] of Object.entries(props)) {
      if (!(field in subject)) continue;
      if (spec !== null && typeof spec === "object" && !Array.isArray(spec)) {
        const fieldSpec = spec as Record<string, unknown>;
        const fieldType = fieldSpec["type"];
        const actualType = typeof subject[field];
        if (fieldType !== undefined && actualType !== fieldType) {
          return err(
            new CredentialSchemaError(`Field '${field}' expected type '${String(fieldType)}', got '${actualType}'`),
          );
        }
      }
    }
  }

  return ok(true);
}

/** Well-known schema IDs for Veritas credential types. */
export const VERITAS_SCHEMA_IDS = {
  VERIFICATION_CREDENTIAL: "https://veritas.croo.network/schemas/verification-credential/v1",
  CLAIM_CREDENTIAL: "https://veritas.croo.network/schemas/claim-credential/v1",
} as const;

/** Build a schema reference for the VerificationCredential schema. */
export function verificationCredentialSchemaRef(): CredentialSchemaRef {
  return Object.freeze({
    id: VERITAS_SCHEMA_IDS.VERIFICATION_CREDENTIAL,
    type: "JsonSchema2023" as const,
  });
}
