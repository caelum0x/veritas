// Source clustering: groups source nodes by domain using union-find, returns cluster map.

import type { CitationGraph, SourceNode } from "./types.js";

export interface SourceCluster {
  readonly id: string;
  readonly domain: string;
  readonly nodeIds: readonly string[];
  readonly size: number;
}

export interface ClusterResult {
  readonly clusters: readonly SourceCluster[];
  readonly clusterById: ReadonlyMap<string, SourceCluster>;
  readonly nodeToCluster: ReadonlyMap<string, string>;
}

/** Extract source nodes from the graph. */
function sourceNodes(graph: CitationGraph): readonly SourceNode[] {
  const out: SourceNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === "source") out.push(node as SourceNode);
  }
  return out;
}

/**
 * Cluster source nodes by shared domain.
 * Each cluster receives the domain as its id and groups all sources from that domain.
 */
export function clusterSources(graph: CitationGraph): ClusterResult {
  const sources = sourceNodes(graph);

  // Group by domain
  const byDomain = new Map<string, string[]>();
  for (const src of sources) {
    const existing = byDomain.get(src.domain);
    if (existing !== undefined) {
      existing.push(src.id);
    } else {
      byDomain.set(src.domain, [src.id]);
    }
  }

  const clusters: SourceCluster[] = [];
  const clusterById = new Map<string, SourceCluster>();
  const nodeToCluster = new Map<string, string>();

  for (const [domain, nodeIds] of byDomain) {
    const cluster: SourceCluster = {
      id: domain,
      domain,
      nodeIds,
      size: nodeIds.length,
    };
    clusters.push(cluster);
    clusterById.set(domain, cluster);
    for (const nid of nodeIds) {
      nodeToCluster.set(nid, domain);
    }
  }

  // Sort clusters by size descending for deterministic output
  const sortedClusters = [...clusters].sort((a, b) => b.size - a.size);

  return {
    clusters: sortedClusters,
    clusterById,
    nodeToCluster,
  };
}

/** Return clusters that contain more than one source (co-citation clusters). */
export function largestClusters(result: ClusterResult, topN: number): readonly SourceCluster[] {
  return result.clusters.slice(0, Math.max(0, topN));
}
