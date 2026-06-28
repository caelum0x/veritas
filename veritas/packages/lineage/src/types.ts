// Shared type aliases and branded primitives for the lineage module.
import { Brand, brand } from "@veritas/core";
import { DatasetId } from "@veritas/data-catalog";

export type NodeId = Brand<string, "NodeId">;
export type EdgeId = Brand<string, "EdgeId">;
export type GraphId = Brand<string, "GraphId">;
export type RunId = Brand<string, "RunId">;

export const nodeId = (v: string): NodeId => brand<string, "NodeId">(v);
export const edgeId = (v: string): EdgeId => brand<string, "EdgeId">(v);
export const graphId = (v: string): GraphId => brand<string, "GraphId">(v);
export const runId = (v: string): RunId => brand<string, "RunId">(v);

export type NodeKind = "dataset" | "transformation" | "model" | "report" | "stream" | "external";
export type EdgeKind = "produces" | "consumes" | "derives" | "copies" | "joins";

export interface LineageNode {
  readonly id: NodeId;
  readonly kind: NodeKind;
  readonly label: string;
  readonly datasetId?: DatasetId;
  readonly metadata: Record<string, string>;
  readonly createdAt: string;
}

export interface LineageEdge {
  readonly id: EdgeId;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly kind: EdgeKind;
  readonly transformationLogic?: string;
  readonly createdAt: string;
}

export interface LineageGraph {
  readonly id: GraphId;
  readonly name: string;
  readonly nodes: ReadonlyArray<LineageNode>;
  readonly edges: ReadonlyArray<LineageEdge>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ColumnRef {
  readonly nodeId: NodeId;
  readonly column: string;
}

export interface ColumnEdge {
  readonly from: ColumnRef;
  readonly to: ColumnRef;
  readonly expression?: string;
}

export interface LineageQueryOptions {
  readonly maxDepth?: number;
  readonly kinds?: ReadonlyArray<NodeKind>;
}

export interface DownstreamResult {
  readonly rootNodeId: NodeId;
  readonly impactedNodes: ReadonlyArray<LineageNode>;
  readonly paths: ReadonlyArray<ReadonlyArray<NodeId>>;
  readonly depth: number;
}

export interface ColumnLineageMap {
  readonly nodeId: NodeId;
  readonly column: string;
  readonly upstreamColumns: ReadonlyArray<ColumnRef>;
  readonly downstreamColumns: ReadonlyArray<ColumnRef>;
  readonly expressions: ReadonlyArray<{ readonly from: ColumnRef; readonly expression?: string }>;
}

export interface LineageQueryResult {
  readonly nodes: ReadonlyArray<LineageNode>;
  readonly edges: ReadonlyArray<LineageEdge>;
  readonly totalNodes: number;
  readonly totalEdges: number;
}

export interface LineageFilterOptions {
  readonly nodeKinds?: ReadonlyArray<NodeKind>;
  readonly edgeKinds?: ReadonlyArray<EdgeKind>;
  readonly rootNodeId?: NodeId;
  readonly maxDepth?: number;
  readonly direction?: "upstream" | "downstream" | "both";
}
