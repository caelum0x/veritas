// Hierarchical taxonomy tree structure for claim types and domains.

import type { ClaimType } from "./claim-type.js";
import type { Domain } from "./domain.js";

/** A node in the taxonomy hierarchy. */
export interface TaxonomyNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly children: readonly TaxonomyNode[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Root-level taxonomy with two top-level axes: type and domain. */
export interface TaxonomyTree {
  readonly version: string;
  readonly claimTypeAxis: TaxonomyNode;
  readonly domainAxis: TaxonomyNode;
}

/** Lookup path from root to a node by id. */
export interface TaxonomyPath {
  readonly nodeId: string;
  readonly ancestors: readonly string[];
  readonly depth: number;
}

function leafNode(
  id: string,
  label: string,
  description: string,
  metadata: Readonly<Record<string, unknown>> = {},
): TaxonomyNode {
  return { id, label, description, children: [], metadata };
}

const CLAIM_TYPE_NODES: Readonly<Record<ClaimType, TaxonomyNode>> = {
  statistical: leafNode(
    "claim-type:statistical",
    "Statistical",
    "Numerical data, percentages, or quantitative measurements.",
    { verifiability: "high", requiresData: true },
  ),
  causal: leafNode(
    "claim-type:causal",
    "Causal",
    "Asserts cause-and-effect between two phenomena.",
    { verifiability: "medium", requiresStudy: true },
  ),
  definitional: leafNode(
    "claim-type:definitional",
    "Definitional",
    "Defines or characterises what something is.",
    { verifiability: "medium", requiresSource: true },
  ),
  predictive: leafNode(
    "claim-type:predictive",
    "Predictive",
    "Makes a claim about future states or outcomes.",
    { verifiability: "low", temporal: "future" },
  ),
  quote: leafNode(
    "claim-type:quote",
    "Quote",
    "Attributes specific words to a person or organisation.",
    { verifiability: "high", requiresAttribution: true },
  ),
  event: leafNode(
    "claim-type:event",
    "Event",
    "Asserts that a specific occurrence happened.",
    { verifiability: "high", temporal: "past" },
  ),
  comparative: leafNode(
    "claim-type:comparative",
    "Comparative",
    "Compares two or more entities, quantities, or qualities.",
    { verifiability: "medium", requiresBaseline: true },
  ),
};

const DOMAIN_NODES: Readonly<Record<Domain, TaxonomyNode>> = {
  financial: leafNode(
    "domain:financial",
    "Financial",
    "Markets, stocks, earnings, and economic indicators.",
    { verifierType: "financial", dataSources: ["EDGAR", "news-api"] },
  ),
  scientific: leafNode(
    "domain:scientific",
    "Scientific",
    "Peer-reviewed research and empirical studies.",
    { verifierType: "scientific", dataSources: ["PubMed", "CrossRef"] },
  ),
  medical: leafNode(
    "domain:medical",
    "Medical",
    "Health, treatments, medications, and clinical outcomes.",
    { verifierType: "medical", dataSources: ["PubMed", "ClinicalTrials"] },
  ),
  news: leafNode(
    "domain:news",
    "News",
    "Current events, political developments, and reported incidents.",
    { verifierType: "news", dataSources: ["news-api"] },
  ),
  crypto: leafNode(
    "domain:crypto",
    "Crypto",
    "Blockchain networks, token prices, and on-chain activity.",
    { verifierType: "crypto", dataSources: ["on-chain"] },
  ),
  legal: leafNode(
    "domain:legal",
    "Legal",
    "Laws, regulations, court decisions, and legal obligations.",
    { verifierType: "legal", dataSources: ["legal-db"] },
  ),
  general: leafNode(
    "domain:general",
    "General",
    "Claims that do not fit into a specialised domain.",
    { verifierType: "general", dataSources: [] },
  ),
};

/** The canonical taxonomy tree for Veritas. */
export const VERITAS_TAXONOMY: TaxonomyTree = {
  version: "1.0.0",
  claimTypeAxis: {
    id: "claim-type",
    label: "Claim Type",
    description: "Categorises the logical structure and nature of a claim.",
    children: Object.values(CLAIM_TYPE_NODES),
    metadata: {},
  },
  domainAxis: {
    id: "domain",
    label: "Domain",
    description: "Categorises the subject-matter domain of a claim.",
    children: Object.values(DOMAIN_NODES),
    metadata: {},
  },
};

/** Retrieve a node from the tree by its id. */
export function findNode(
  tree: TaxonomyTree,
  nodeId: string,
): TaxonomyNode | undefined {
  const allNodes: TaxonomyNode[] = [
    tree.claimTypeAxis,
    ...tree.claimTypeAxis.children,
    tree.domainAxis,
    ...tree.domainAxis.children,
  ];
  return allNodes.find((n) => n.id === nodeId);
}

/** Return path metadata for a leaf node id. */
export function taxonomyPath(
  tree: TaxonomyTree,
  nodeId: string,
): TaxonomyPath | undefined {
  const inClaimType = tree.claimTypeAxis.children.some((n) => n.id === nodeId);
  if (inClaimType) {
    return { nodeId, ancestors: [tree.claimTypeAxis.id], depth: 1 };
  }
  const inDomain = tree.domainAxis.children.some((n) => n.id === nodeId);
  if (inDomain) {
    return { nodeId, ancestors: [tree.domainAxis.id], depth: 1 };
  }
  return undefined;
}

/** Get the TaxonomyNode for a given ClaimType. */
export function claimTypeNode(type: ClaimType): TaxonomyNode {
  return CLAIM_TYPE_NODES[type];
}

/** Get the TaxonomyNode for a given Domain. */
export function domainNode(domain: Domain): TaxonomyNode {
  return DOMAIN_NODES[domain];
}
