// Tracks data lineage events and records node/edge provenance during pipeline runs.
import { Result, ok, err, newId } from "@veritas/core";
import { LineageNode, LineageEdge, GraphId, NodeId, RunId, runId } from "./types.js";
import { CreateNodeInput } from "./node.js";
import { CreateEdgeInput } from "./edge.js";
import { LineageGraphStore } from "./graph.js";
import { LineageGraphNotFoundError, LineageNodeNotFoundError, CyclicLineageError } from "./errors.js";

export interface LineageRun {
  readonly id: RunId;
  readonly graphId: GraphId;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly nodeIds: ReadonlyArray<NodeId>;
}

export interface LineageTracker {
  startRun(graphId: GraphId): Result<LineageRun, LineageGraphNotFoundError>;
  trackNode(runId: RunId, input: CreateNodeInput): Result<LineageNode, LineageGraphNotFoundError>;
  trackEdge(runId: RunId, input: CreateEdgeInput): Result<LineageEdge, LineageGraphNotFoundError | LineageNodeNotFoundError | CyclicLineageError>;
  endRun(runId: RunId): Result<LineageRun, LineageGraphNotFoundError>;
  getRun(runId: RunId): LineageRun | undefined;
}

export function createLineageTracker(store: LineageGraphStore): LineageTracker {
  const runs = new Map<RunId, LineageRun>();

  return {
    startRun(graphId: GraphId): Result<LineageRun, LineageGraphNotFoundError> {
      const graphResult = store.getGraph(graphId);
      if (!graphResult.ok) return graphResult;
      const run: LineageRun = {
        id: runId(newId("run")),
        graphId,
        startedAt: new Date().toISOString(),
        nodeIds: [],
      };
      runs.set(run.id, run);
      return ok(run);
    },

    trackNode(rId: RunId, input: CreateNodeInput): Result<LineageNode, LineageGraphNotFoundError> {
      const run = runs.get(rId);
      if (!run) return err(new LineageGraphNotFoundError(rId));
      const result = store.addNode(run.graphId, input);
      if (!result.ok) return result;
      const node = result.value;
      runs.set(rId, { ...run, nodeIds: [...run.nodeIds, node.id] });
      return ok(node);
    },

    trackEdge(
      rId: RunId,
      input: CreateEdgeInput
    ): Result<LineageEdge, LineageGraphNotFoundError | LineageNodeNotFoundError | CyclicLineageError> {
      const run = runs.get(rId);
      if (!run) return err(new LineageGraphNotFoundError(rId));
      return store.addEdge(run.graphId, input);
    },

    endRun(rId: RunId): Result<LineageRun, LineageGraphNotFoundError> {
      const run = runs.get(rId);
      if (!run) return err(new LineageGraphNotFoundError(rId));
      const ended: LineageRun = { ...run, endedAt: new Date().toISOString() };
      runs.set(rId, ended);
      return ok(ended);
    },

    getRun(rId: RunId): LineageRun | undefined {
      return runs.get(rId);
    },
  };
}
