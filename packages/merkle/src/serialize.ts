// Proof serialization: encode MerkleProof to/from JSON-safe SerializedProof.
import { z } from "zod";
import { MerkleProof, SerializedProof, ProofSide, asHexHash } from "./types.js";
import { MalformedProofError } from "./errors.js";

const proofSideSchema = z.enum(["left", "right"]);

const serializedProofSchema = z.object({
  version: z.literal(1),
  root: z.string().min(64).max(64),
  leafIndex: z.number().int().min(0),
  leafHash: z.string().min(64).max(64),
  steps: z.array(
    z.object({
      sibling: z.string().min(64).max(64),
      side: proofSideSchema,
    }),
  ),
});

/** Serialize a MerkleProof to a plain JSON-compatible object. */
export function serializeProof(proof: MerkleProof): SerializedProof {
  return {
    version: 1,
    root: proof.root,
    leafIndex: proof.leafIndex,
    leafHash: proof.leafHash,
    steps: proof.steps.map((s) => ({ sibling: s.sibling, side: s.side })),
  };
}

/** Deserialize a SerializedProof back into a MerkleProof; throws MalformedProofError on bad input. */
export function deserializeProof(raw: unknown): MerkleProof {
  const result = serializedProofSchema.safeParse(raw);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const field = firstIssue != null ? firstIssue.path.join(".") || "root" : "unknown";
    throw new MalformedProofError(field);
  }
  const d = result.data;
  return {
    root: asHexHash(d.root),
    leafIndex: d.leafIndex,
    leafHash: asHexHash(d.leafHash),
    steps: d.steps.map((s) => ({
      sibling: asHexHash(s.sibling),
      side: s.side as ProofSide,
    })),
  };
}

/** Encode a MerkleProof to a compact JSON string. */
export function proofToJson(proof: MerkleProof): string {
  return JSON.stringify(serializeProof(proof));
}

/** Decode a compact JSON string back into a MerkleProof. */
export function proofFromJson(json: string): MerkleProof {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (cause) {
    throw new MalformedProofError("json");
  }
  return deserializeProof(parsed);
}
