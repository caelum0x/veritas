// Persistent store interface and in-memory implementation for workflow state.
import type {
  WorkflowId,
  ExecutionId,
  WorkflowStatus,
  JsonValue,
} from "./types.js";
import { newWorkflowId, newExecutionId } from "./types.js";

export interface WorkflowRecord {
  readonly workflowId: WorkflowId;
  readonly name: string;
  readonly status: WorkflowStatus;
  readonly input: JsonValue;
  readonly output: JsonValue | undefined;
  readonly error: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | undefined;
}

export interface ExecutionRecord {
  readonly executionId: ExecutionId;
  readonly workflowId: WorkflowId;
  readonly attempt: number;
  readonly status: WorkflowStatus;
  readonly startedAt: string;
  readonly completedAt: string | undefined;
  readonly error: string | undefined;
}

export interface WorkflowStore {
  createWorkflow(name: string, input: JsonValue): Promise<WorkflowRecord>;
  getWorkflow(workflowId: WorkflowId): Promise<WorkflowRecord | undefined>;
  updateWorkflow(
    workflowId: WorkflowId,
    patch: Partial<Pick<WorkflowRecord, "status" | "output" | "error" | "completedAt">>
  ): Promise<WorkflowRecord | undefined>;
  listWorkflows(status?: WorkflowStatus): Promise<readonly WorkflowRecord[]>;
  deleteWorkflow(workflowId: WorkflowId): Promise<boolean>;

  createExecution(workflowId: WorkflowId, attempt: number): Promise<ExecutionRecord>;
  getExecution(executionId: ExecutionId): Promise<ExecutionRecord | undefined>;
  updateExecution(
    executionId: ExecutionId,
    patch: Partial<Pick<ExecutionRecord, "status" | "completedAt" | "error">>
  ): Promise<ExecutionRecord | undefined>;
  listExecutions(workflowId: WorkflowId): Promise<readonly ExecutionRecord[]>;
}

/** Creates a fully in-memory WorkflowStore for single-node or test environments. */
export function createInMemoryWorkflowStore(): WorkflowStore {
  const workflows = new Map<WorkflowId, WorkflowRecord>();
  const executions = new Map<ExecutionId, ExecutionRecord>();

  const now = () => new Date().toISOString();

  return {
    async createWorkflow(name, input) {
      const record: WorkflowRecord = {
        workflowId: newWorkflowId(),
        name,
        status: "pending",
        input,
        output: undefined,
        error: undefined,
        createdAt: now(),
        updatedAt: now(),
        completedAt: undefined,
      };
      workflows.set(record.workflowId, record);
      return record;
    },

    async getWorkflow(workflowId) {
      return workflows.get(workflowId);
    },

    async updateWorkflow(workflowId, patch) {
      const existing = workflows.get(workflowId);
      if (existing === undefined) return undefined;
      const updated: WorkflowRecord = { ...existing, ...patch, updatedAt: now() };
      workflows.set(workflowId, updated);
      return updated;
    },

    async listWorkflows(status) {
      const all = [...workflows.values()];
      return status === undefined ? all : all.filter((w) => w.status === status);
    },

    async deleteWorkflow(workflowId) {
      return workflows.delete(workflowId);
    },

    async createExecution(workflowId, attempt) {
      const record: ExecutionRecord = {
        executionId: newExecutionId(),
        workflowId,
        attempt,
        status: "running",
        startedAt: now(),
        completedAt: undefined,
        error: undefined,
      };
      executions.set(record.executionId, record);
      return record;
    },

    async getExecution(executionId) {
      return executions.get(executionId);
    },

    async updateExecution(executionId, patch) {
      const existing = executions.get(executionId);
      if (existing === undefined) return undefined;
      const updated: ExecutionRecord = { ...existing, ...patch };
      executions.set(executionId, updated);
      return updated;
    },

    async listExecutions(workflowId) {
      return [...executions.values()].filter((e) => e.workflowId === workflowId);
    },
  };
}
