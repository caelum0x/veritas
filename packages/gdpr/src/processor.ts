// DSR processor: orchestrate execution of data subject requests across registered data handlers.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import { type Id, newId } from "@veritas/core";

export type DsrProcessorId = Id<"dsrproc">;
export const newDsrProcessorId = (): DsrProcessorId => newId("dsrproc");

export const DsrTypeSchema = z.enum([
  "access",
  "erasure",
  "portability",
  "rectification",
  "restriction",
  "objection",
]);
export type DsrType = z.infer<typeof DsrTypeSchema>;

export const DsrStatusSchema = z.enum([
  "pending",
  "in_progress",
  "awaiting_verification",
  "completed",
  "rejected",
  "cancelled",
]);
export type DsrStatus = z.infer<typeof DsrStatusSchema>;

export interface DataHandlerContext {
  readonly subjectId: string;
  readonly requestType: DsrType;
  readonly requestId: string;
  readonly metadata: Record<string, unknown>;
}

export interface DataHandlerResult {
  readonly handlerName: string;
  readonly success: boolean;
  readonly affectedRecords: number;
  readonly details?: string;
}

/** Port interface for data handlers — implement per data store/domain. */
export interface DataHandler {
  readonly name: string;
  readonly supportedTypes: ReadonlySet<DsrType>;
  execute(ctx: DataHandlerContext): Promise<DataHandlerResult>;
}

export interface ProcessorExecutionSummary {
  readonly requestId: string;
  readonly subjectId: string;
  readonly type: DsrType;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly results: readonly DataHandlerResult[];
  readonly totalAffectedRecords: number;
  readonly allSucceeded: boolean;
}

/** DSR processor that fans out to all registered data handlers. */
export class DsrProcessor {
  private readonly handlers: DataHandler[] = [];

  registerHandler(handler: DataHandler): void {
    this.handlers.push(handler);
  }

  async process(
    requestId: string,
    subjectId: string,
    type: DsrType,
    metadata: Record<string, unknown> = {},
  ): Promise<Result<ProcessorExecutionSummary>> {
    const eligible = this.handlers.filter((h) => h.supportedTypes.has(type));
    if (eligible.length === 0) {
      return err(new Error(`No handlers registered for DSR type: ${type}`));
    }

    const startedAt = epochToIso(Date.now());
    const ctx: DataHandlerContext = { subjectId, requestType: type, requestId, metadata };

    const settled = await Promise.allSettled(eligible.map((h) => h.execute(ctx)));
    const completedAt = epochToIso(Date.now());

    const results: DataHandlerResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      return {
        handlerName: eligible[i]!.name,
        success: false,
        affectedRecords: 0,
        details: s.reason instanceof Error ? s.reason.message : String(s.reason),
      };
    });

    const totalAffectedRecords = results.reduce((sum, r) => sum + r.affectedRecords, 0);
    const allSucceeded = results.every((r) => r.success);

    return ok({
      requestId,
      subjectId,
      type,
      startedAt,
      completedAt,
      results,
      totalAffectedRecords,
      allSucceeded,
    });
  }

  listHandlers(): ReadonlyArray<{ name: string; supportedTypes: readonly DsrType[] }> {
    return this.handlers.map((h) => ({
      name: h.name,
      supportedTypes: Array.from(h.supportedTypes),
    }));
  }
}

/** No-op handler for testing or stubbing unsupported data stores. */
export class NoopDataHandler implements DataHandler {
  readonly supportedTypes: ReadonlySet<DsrType>;

  constructor(
    readonly name: string,
    types: DsrType[] = ["access", "erasure", "portability", "rectification", "restriction", "objection"],
  ) {
    this.supportedTypes = new Set(types);
  }

  async execute(ctx: DataHandlerContext): Promise<DataHandlerResult> {
    return {
      handlerName: this.name,
      success: true,
      affectedRecords: 0,
      details: `No-op handler: no action taken for ${ctx.requestType}`,
    };
  }
}
