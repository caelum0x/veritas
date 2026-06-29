// DID Document structure per W3C DID Core 1.0 specification.
import { z } from "zod";
import type { Did } from "./did.js";
import type { VerificationMethod } from "./verification-method.js";
import type { DidService } from "./service.js";

/** Verification relationship types defined in DID Core. */
export type VerificationRelationship =
  | "authentication"
  | "assertionMethod"
  | "keyAgreement"
  | "capabilityInvocation"
  | "capabilityDelegation";

/** A reference to a verification method — either embedded or by DID URL. */
export type VerificationMethodRef = VerificationMethod | string;

/** W3C DID Document. All fields are immutable. */
export interface DidDocument {
  readonly "@context": readonly string[];
  readonly id: Did;
  readonly controller?: Did | readonly Did[];
  readonly alsoKnownAs?: readonly string[];
  readonly verificationMethod?: readonly VerificationMethod[];
  readonly authentication?: readonly VerificationMethodRef[];
  readonly assertionMethod?: readonly VerificationMethodRef[];
  readonly keyAgreement?: readonly VerificationMethodRef[];
  readonly capabilityInvocation?: readonly VerificationMethodRef[];
  readonly capabilityDelegation?: readonly VerificationMethodRef[];
  readonly service?: readonly DidService[];
}

/** Standard W3C DID context URL. */
export const DID_CONTEXT = "https://www.w3.org/ns/did/v1" as const;

/** Build a minimal valid DID Document with the given id. */
export function makeDidDocument(
  id: Did,
  overrides: Partial<Omit<DidDocument, "id" | "@context">> = {},
): DidDocument {
  return Object.freeze({
    "@context": [DID_CONTEXT],
    id,
    ...overrides,
  });
}

/** Zod schema for validating a raw DID Document object (minimal checks). */
export const didDocumentSchema = z.object({
  "@context": z.union([z.string(), z.array(z.string())]),
  id: z.string().startsWith("did:"),
  controller: z.union([z.string(), z.array(z.string())]).optional(),
  alsoKnownAs: z.array(z.string()).optional(),
  verificationMethod: z.array(z.record(z.unknown())).optional(),
  authentication: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  assertionMethod: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  keyAgreement: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  capabilityInvocation: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  capabilityDelegation: z.array(z.union([z.string(), z.record(z.unknown())])).optional(),
  service: z.array(z.record(z.unknown())).optional(),
});

/** Retrieve all verification methods from a document (embedded + relationship-embedded). */
export function allVerificationMethods(doc: DidDocument): readonly VerificationMethod[] {
  const embedded: VerificationMethod[] = [...(doc.verificationMethod ?? [])];

  const relationships: (keyof Pick<
    DidDocument,
    | "authentication"
    | "assertionMethod"
    | "keyAgreement"
    | "capabilityInvocation"
    | "capabilityDelegation"
  >)[] = [
    "authentication",
    "assertionMethod",
    "keyAgreement",
    "capabilityInvocation",
    "capabilityDelegation",
  ];

  for (const rel of relationships) {
    const refs = doc[rel];
    if (!refs) continue;
    for (const ref of refs) {
      if (typeof ref !== "string") {
        embedded.push(ref as VerificationMethod);
      }
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return embedded.filter((vm) => {
    if (seen.has(vm.id)) return false;
    seen.add(vm.id);
    return true;
  });
}
