// Attestation schema definitions (EAS-like): describe the shape of attested data

import { z } from "zod";
import { sha256Hex } from "@veritas/core";

/** A single field in an attestation schema */
export const SchemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["bytes32", "address", "uint256", "int256", "bool", "string", "bytes"]),
  description: z.string().optional(),
});
export type SchemaField = z.infer<typeof SchemaFieldSchema>;

/** An attestation schema record */
export const AttestationSchemaSchema = z.object({
  uid: z.string(),
  name: z.string().min(1),
  description: z.string(),
  fields: z.array(SchemaFieldSchema).min(1),
  resolver: z.string().optional(),
  revocable: z.boolean(),
  registeredAt: z.number().int().nonnegative(),
  registrar: z.string(),
});
export type AttestationSchema = z.infer<typeof AttestationSchemaSchema>;

/** Input for registering a new schema */
export const RegisterSchemaSchema = AttestationSchemaSchema.omit({
  uid: true,
  registeredAt: true,
});
export type RegisterSchema = z.infer<typeof RegisterSchemaSchema>;

/** Derive a deterministic schema UID from its canonical form */
export function deriveSchemaUid(schema: RegisterSchema): string {
  const canonical = JSON.stringify({
    name: schema.name,
    fields: schema.fields.map((f) => ({ name: f.name, type: f.type })),
    revocable: schema.revocable,
    resolver: schema.resolver ?? null,
  });
  return `0x${sha256Hex(canonical)}`;
}

/** The canonical Veritas report attestation schema */
export const VERITAS_REPORT_SCHEMA: RegisterSchema = {
  name: "VeritasReport",
  description: "Attestation of a Veritas verification report result",
  revocable: true,
  fields: [
    { name: "reportId", type: "string", description: "Veritas report identifier" },
    { name: "reportHash", type: "bytes32", description: "SHA-256 content hash of the report" },
    { name: "verificationId", type: "string", description: "Associated verification request" },
    { name: "trustScore", type: "uint256", description: "Trust score scaled to 1e6" },
    { name: "verdict", type: "string", description: "Final verdict string" },
    { name: "claimCount", type: "uint256", description: "Number of claims verified" },
    { name: "issuedAt", type: "uint256", description: "Unix timestamp of issuance" },
  ],
  registrar: "veritas-system",
};
