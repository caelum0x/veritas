// Cluster contradictory claim sets into connected components via union-find.
import type { ClaimPair } from "./pair.js";
import { isContradiction } from "./relation.js";

export interface ContradictionCluster {
  readonly clusterId: string;
  /** Claim IDs that mutually contradict each other */
  readonly claimIds: ReadonlyArray<string>;
  /** Pairs within this cluster */
  readonly pairs: ReadonlyArray<ClaimPair>;
}

/** Union-Find data structure for clustering */
class UnionFind {
  private readonly parent: Map<string, string> = new Map();

  find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
    }
    const p = this.parent.get(id)!;
    if (p !== id) {
      const root = this.find(p);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }

  groups(): Map<string, Set<string>> {
    const result: Map<string, Set<string>> = new Map();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const group = result.get(root) ?? new Set<string>();
      group.add(id);
      result.set(root, group);
    }
    return result;
  }
}

/**
 * Cluster scored claim pairs into contradiction clusters.
 * Only pairs where nliScore indicates contradiction are considered.
 */
export function clusterContradictions(
  pairs: ReadonlyArray<ClaimPair>,
  minConfidence = 0.5,
): ReadonlyArray<ContradictionCluster> {
  const uf = new UnionFind();
  const contradictingPairs: ClaimPair[] = [];

  for (const pair of pairs) {
    const score = pair.nliScore;
    if (score && isContradiction(score) && score.confidence >= minConfidence) {
      uf.union(pair.premise.id, pair.hypothesis.id);
      contradictingPairs.push(pair);
    }
  }

  const groups = uf.groups();
  const clusters: ContradictionCluster[] = [];
  let idx = 0;

  for (const [root, members] of groups) {
    const claimIds = Array.from(members);
    const clusterPairs = contradictingPairs.filter(
      (p) =>
        claimIds.includes(p.premise.id) &&
        claimIds.includes(p.hypothesis.id),
    );
    clusters.push({
      clusterId: `cluster-${root}-${idx++}`,
      claimIds,
      pairs: clusterPairs,
    });
  }

  return clusters;
}
