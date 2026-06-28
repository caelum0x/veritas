// Wrap @veritas/merkle to generate and verify inclusion proofs for verification reports.
import {
  buildTree,
  generateProof,
  verifyProof,
  hashLeaf,
  type MerkleProof,
  type MerkleTree,
  type SerializedProof,
  serializeProof,
  deserializeProof,
} from "@veritas/merkle";
import { canonicalize } from "@veritas/core";

/** A report leaf value: anything JSON-serialisable. */
export type ReportLeaf = Record<string, unknown>;

/** A Merkle inclusion proof for a report inside a batch. */
export interface ReportMerkleProof {
  readonly reportIndex: number;
  readonly reportLeafHash: string;
  readonly tree: MerkleTree;
  readonly proof: MerkleProof;
  readonly serialized: SerializedProof;
}

/**
 * Build a Merkle tree over a batch of report objects.
 * Each report is canonicalized to JSON before hashing.
 */
export function buildReportTree(reports: readonly ReportLeaf[]): MerkleTree {
  const leaves = reports.map((r) => canonicalize(r));
  return buildTree(leaves);
}

/**
 * Generate a Merkle inclusion proof for a single report in a batch.
 */
export function proveReport(
  reports: readonly ReportLeaf[],
  reportIndex: number,
): ReportMerkleProof {
  const leaves = reports.map((r) => canonicalize(r));
  const tree = buildTree(leaves);
  const proof = generateProof(tree, reportIndex);
  const serialized = serializeProof(proof);
  const reportLeafHash = hashLeaf(canonicalize(reports[reportIndex]!));
  return { reportIndex, reportLeafHash, tree, proof, serialized };
}

/**
 * Verify a serialized Merkle proof for a report against a known root.
 */
export function verifyReportProof(
  serialized: SerializedProof,
  expectedRoot: string,
  reportJson: string,
): boolean {
  try {
    const proof = deserializeProof(serialized);
    if (proof.root !== expectedRoot) return false;
    const leafHash = hashLeaf(reportJson);
    if (leafHash !== proof.leafHash) return false;
    return verifyProof(proof);
  } catch {
    return false;
  }
}
