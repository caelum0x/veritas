// Source diversity score: measures domain/tier spread across source nodes in a CitationGraph.

import type { CitationGraph, SourceNode } from "./types.js";

export interface DiversityBreakdown {
  readonly domainCount: number;
  readonly tierCounts: Readonly<Record<string, number>>;
  readonly uniqueDomains: readonly string[];
  readonly shannonEntropy: number;
  readonly score: number;
}

/** Compute Shannon entropy over a frequency map. */
function shannonEntropy(frequencies: readonly number[]): number {
  const total = frequencies.reduce((s, n) => s + n, 0);
  if (total === 0) return 0;
  return frequencies.reduce((acc, n) => {
    if (n === 0) return acc;
    const p = n / total;
    return acc - p * Math.log2(p);
  }, 0);
}

/** Extract all SourceNodes from the graph. */
function sourceNodes(graph: CitationGraph): readonly SourceNode[] {
  const result: SourceNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === "source") result.push(node as SourceNode);
  }
  return result;
}

/**
 * Score domain diversity in [0,1]: 0 = single domain, 1 = maximally spread.
 * Uses normalised Shannon entropy over domain frequencies.
 */
export function diversityScore(graph: CitationGraph): DiversityBreakdown {
  const sources = sourceNodes(graph);

  if (sources.length === 0) {
    return {
      domainCount: 0,
      tierCounts: {},
      uniqueDomains: [],
      shannonEntropy: 0,
      score: 0,
    };
  }

  const domainFreq = new Map<string, number>();
  const tierFreq = new Map<string, number>();

  for (const src of sources) {
    domainFreq.set(src.domain, (domainFreq.get(src.domain) ?? 0) + 1);
    tierFreq.set(src.tier, (tierFreq.get(src.tier) ?? 0) + 1);
  }

  const frequencies = [...domainFreq.values()];
  const entropy = shannonEntropy(frequencies);
  const maxEntropy = domainFreq.size > 1 ? Math.log2(domainFreq.size) : 1;
  const score = Math.min(1, entropy / maxEntropy);

  const tierCounts: Record<string, number> = {};
  for (const [tier, count] of tierFreq) {
    tierCounts[tier] = count;
  }

  return {
    domainCount: domainFreq.size,
    tierCounts,
    uniqueDomains: [...domainFreq.keys()],
    shannonEntropy: entropy,
    score,
  };
}
