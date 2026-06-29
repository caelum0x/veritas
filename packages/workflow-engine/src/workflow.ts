// Durable workflow definition: type, version, schema, and execution function shape.
import type { JsonValue, WorkflowId, WorkflowOptions } from "./types.js";
import { newWorkflowId } from "./types.js";
import type { WorkflowContext } from "./context.js";

export interface WorkflowDefinition<
  TInput extends JsonValue = JsonValue,
  TOutput extends JsonValue = JsonValue,
> {
  readonly type: string;
  readonly version: number;
  readonly options?: WorkflowOptions;
  execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
}

export interface WorkflowDescriptor {
  readonly workflowId: WorkflowId;
  readonly type: string;
  readonly version: number;
  readonly taskQueue: string;
}

export function createWorkflowDefinition<
  TInput extends JsonValue,
  TOutput extends JsonValue,
>(def: WorkflowDefinition<TInput, TOutput>): WorkflowDefinition<TInput, TOutput> {
  return def;
}

export function newWorkflowDescriptor(
  type: string,
  version: number,
  taskQueue = "default"
): WorkflowDescriptor {
  return { workflowId: newWorkflowId(), type, version, taskQueue };
}

export class WorkflowRegistry {
  private readonly _defs = new Map<string, WorkflowDefinition>();

  register(def: WorkflowDefinition): void {
    this._defs.set(def.type, def);
    this._defs.set(`${def.type}@${def.version}`, def);
  }

  resolve(type: string, version?: number): WorkflowDefinition | undefined {
    const key = version !== undefined ? `${type}@${version}` : type;
    return this._defs.get(key);
  }

  has(type: string, version?: number): boolean {
    const key = version !== undefined ? `${type}@${version}` : type;
    return this._defs.has(key);
  }

  listTypes(): string[] {
    return Array.from(this._defs.keys()).filter((k) => !k.includes("@"));
  }
}
