// export.ts: serialize a FactGraph to JSON-LD, N-Triples, and adjacency-list formats.
import { ok, err, type Result } from "@veritas/core";
import type { FactGraph, EntityNode, RelationEdge, Triple } from "./types.js";
import { ExportError } from "./errors.js";

/** Supported export formats. */
export type ExportFormat = "json-ld" | "ntriples" | "adjacency" | "cytoscape";

/** Options for graph export. */
export interface ExportOptions {
  readonly format: ExportFormat;
  readonly baseUri?: string;
  readonly includeProvenance?: boolean;
}

/** Raw export output. */
export interface ExportResult {
  readonly format: ExportFormat;
  readonly content: string;
  readonly entityCount: number;
  readonly relationCount: number;
  readonly tripleCount: number;
}

/** Export a FactGraph to the requested format. */
export function exportGraph(
  graph: FactGraph,
  opts: ExportOptions,
): Result<ExportResult, ExportError> {
  try {
    const content = serialize(graph, opts);
    return ok({
      format: opts.format,
      content,
      entityCount: graph.entities.length,
      relationCount: graph.relations.length,
      tripleCount: graph.triples.length,
    });
  } catch (cause) {
    return err(
      new ExportError(
        opts.format,
        cause instanceof Error ? cause.message : String(cause),
      ),
    );
  }
}

function serialize(graph: FactGraph, opts: ExportOptions): string {
  switch (opts.format) {
    case "json-ld":
      return toJsonLd(graph, opts);
    case "ntriples":
      return toNTriples(graph, opts);
    case "adjacency":
      return toAdjacency(graph);
    case "cytoscape":
      return toCytoscape(graph);
  }
}

// JSON-LD serialization
function toJsonLd(graph: FactGraph, opts: ExportOptions): string {
  const base = opts.baseUri ?? "https://veritas.example/kg/";
  const doc: Record<string, unknown> = {
    "@context": {
      "@base": base,
      "veritas": "https://veritas.example/vocab#",
      "label": "veritas:label",
      "type": "veritas:entityType",
      "relation": "veritas:relation",
      "subject": { "@id": "veritas:subject", "@type": "@id" },
      "object": { "@id": "veritas:object", "@type": "@id" },
      "confidence": "veritas:confidence",
    },
    "@graph": [
      ...graph.entities.map((e) => entityToJsonLd(e, opts)),
      ...graph.relations.map((r) => relationToJsonLd(r, opts)),
    ],
  };
  return JSON.stringify(doc, null, 2);
}

function entityToJsonLd(
  e: EntityNode,
  opts: ExportOptions,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@id": e.id,
    "@type": `veritas:${e.type}`,
    "label": e.label,
  };
  if (e.aliases.length > 0) node["aliases"] = [...e.aliases];
  if (opts.includeProvenance === true) {
    node["provenance"] = {
      confidence: e.provenance.confidence,
      extractedAt: e.provenance.extractedAt,
      ...(e.provenance.claimId !== undefined ? { claimId: e.provenance.claimId } : {}),
      ...(e.provenance.sourceId !== undefined ? { sourceId: e.provenance.sourceId } : {}),
    };
  }
  return node;
}

function relationToJsonLd(
  r: RelationEdge,
  opts: ExportOptions,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@id": r.id,
    "@type": "veritas:Relation",
    "relation": r.type,
    "label": r.label,
    "subject": { "@id": r.subjectId },
    "object": { "@id": r.objectId },
    "weight": r.weight,
  };
  if (opts.includeProvenance === true) {
    node["provenance"] = { confidence: r.provenance.confidence };
  }
  return node;
}

// N-Triples serialization (W3C RDF format)
function toNTriples(graph: FactGraph, opts: ExportOptions): string {
  const base = opts.baseUri ?? "https://veritas.example/kg/";
  const lines: string[] = [];

  for (const e of graph.entities) {
    lines.push(`<${base}${e.id}> <https://veritas.example/vocab#label> "${escape(e.label)}" .`);
    lines.push(`<${base}${e.id}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://veritas.example/vocab#${e.type}> .`);
    for (const alias of e.aliases) {
      lines.push(`<${base}${e.id}> <https://veritas.example/vocab#alias> "${escape(alias)}" .`);
    }
  }

  for (const r of graph.relations) {
    lines.push(`<${base}${r.subjectId}> <https://veritas.example/vocab#${r.type}> <${base}${r.objectId}> .`);
  }

  for (const t of graph.triples) {
    lines.push(`<${base}${t.subjectId}> <https://veritas.example/vocab#${escape(t.predicate)}> <${base}${t.objectId}> .`);
  }

  return lines.join("\n");
}

// Adjacency list serialization
function toAdjacency(graph: FactGraph): string {
  const adj: Record<string, { label: string; neighbors: string[] }> = {};

  for (const e of graph.entities) {
    adj[e.id] = { label: e.label, neighbors: [] };
  }

  for (const r of graph.relations) {
    const node = adj[r.subjectId];
    if (node !== undefined) {
      node.neighbors.push(r.objectId);
    }
  }

  return JSON.stringify(adj, null, 2);
}

// Cytoscape.js-compatible format
function toCytoscape(graph: FactGraph): string {
  const elements: unknown[] = [
    ...graph.entities.map((e) => ({
      group: "nodes",
      data: { id: e.id, label: e.label, type: e.type },
    })),
    ...graph.relations.map((r) => ({
      group: "edges",
      data: {
        id: r.id,
        source: r.subjectId,
        target: r.objectId,
        label: r.label,
        type: r.type,
        weight: r.weight,
      },
    })),
  ];

  return JSON.stringify({ elements }, null, 2);
}

/** Escape special characters for N-Triples string literals. */
function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/** Convert export result to a Buffer for streaming. */
export function exportToBuffer(result: ExportResult): Buffer {
  return Buffer.from(result.content, "utf-8");
}
