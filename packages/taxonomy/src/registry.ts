// Taxonomy registry: stores TaxonomyNodes and VerifierMappings; supports lookup and traversal.
import { ok, err, type Result, type AppError } from "@veritas/core";
import { TaxonomyNodeNotFoundError, UnmappedDomainError } from "./errors.js";
import type { TaxonomyNode, VerifierMapping } from "./types.js";
import type { Domain } from "./domain.js";
import type { ClaimType } from "./claim-type.js";

/** Options for querying nodes by domain or claim type */
export interface NodeQueryOptions {
  readonly domain?: Domain;
  readonly claimType?: ClaimType;
}

/** Taxonomy registry holding all nodes and domain-to-verifier mappings */
export class TaxonomyRegistry {
  private readonly nodes = new Map<string, TaxonomyNode>();
  private readonly mappings = new Map<Domain, VerifierMapping>();

  /** Register a taxonomy node; overwrites if id already present */
  registerNode(node: TaxonomyNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  /** Bulk-register taxonomy nodes */
  registerNodes(nodes: ReadonlyArray<TaxonomyNode>): this {
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
    return this;
  }

  /** Register a verifier mapping for a domain; overwrites existing mapping */
  registerMapping(mapping: VerifierMapping): this {
    this.mappings.set(mapping.domain, mapping);
    return this;
  }

  /** Retrieve a node by id */
  getNode(id: string): Result<TaxonomyNode, AppError> {
    const node = this.nodes.get(id);
    if (!node) return err(new TaxonomyNodeNotFoundError(id));
    return ok(node);
  }

  /** List all nodes, optionally filtered by domain and/or claim type */
  listNodes(options: NodeQueryOptions = {}): ReadonlyArray<TaxonomyNode> {
    const all = [...this.nodes.values()];
    return all.filter((n) => {
      if (options.domain !== undefined && n.domain !== options.domain) return false;
      if (options.claimType !== undefined && n.claimType !== options.claimType) return false;
      return true;
    });
  }

  /** Return root nodes (those with no parent) */
  getRootNodes(): ReadonlyArray<TaxonomyNode> {
    return [...this.nodes.values()].filter((n) => n.parentId === null);
  }

  /** Return direct children of a node */
  getChildren(parentId: string): Result<ReadonlyArray<TaxonomyNode>, AppError> {
    if (!this.nodes.has(parentId)) {
      return err(new TaxonomyNodeNotFoundError(parentId));
    }
    const children = [...this.nodes.values()].filter((n) => n.parentId === parentId);
    return ok(children);
  }

  /** Return ancestors of a node from immediate parent up to root */
  getAncestors(nodeId: string): Result<ReadonlyArray<TaxonomyNode>, AppError> {
    const startResult = this.getNode(nodeId);
    if (!startResult.ok) return err(startResult.error);

    const ancestors: TaxonomyNode[] = [];
    let current: TaxonomyNode = startResult.value;

    while (current.parentId !== null) {
      const parentResult = this.getNode(current.parentId);
      if (!parentResult.ok) break;
      ancestors.push(parentResult.value);
      current = parentResult.value;
    }

    return ok(ancestors);
  }

  /** Retrieve the verifier mapping for a domain */
  getMapping(domain: Domain): Result<VerifierMapping, AppError> {
    const mapping = this.mappings.get(domain);
    if (!mapping) return err(new UnmappedDomainError(domain));
    return ok(mapping);
  }

  /** List all registered verifier mappings */
  listMappings(): ReadonlyArray<VerifierMapping> {
    return [...this.mappings.values()];
  }

  /** Check whether a node exists */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /** Check whether a mapping exists for a domain */
  hasMapping(domain: Domain): boolean {
    return this.mappings.has(domain);
  }

  /** Total count of registered nodes */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /** Total count of registered mappings */
  get mappingCount(): number {
    return this.mappings.size;
  }
}

/** Module-level singleton registry */
export const globalTaxonomyRegistry = new TaxonomyRegistry();
