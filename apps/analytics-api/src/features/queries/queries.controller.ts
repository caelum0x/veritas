// Query controller: validates requests, delegates to QueryService, sends HTTP responses.
import type { Request, Response } from "express";
import { isOk } from "@veritas/core";
import { RunQueryBodySchema, ListSourcesQuerySchema } from "./queries.schema.js";
import { toQueryResult } from "./queries.mapper.js";
import type { QueryService } from "./queries.service.js";

export interface QueryControllerDeps {
  readonly queryService: QueryService;
}

export function makeQueriesController(deps: QueryControllerDeps) {
  const { queryService } = deps;

  async function runQuery(req: Request, res: Response): Promise<void> {
    const parsed = RunQueryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
      return;
    }

    const start = Date.now();
    const result = await queryService.runQuery({
      sql: parsed.data.sql,
      timeoutMs: parsed.data.timeoutMs,
    });

    if (!isOk(result)) {
      const err = result.error as unknown as { code?: string; message: string };
      const code = err.code ?? "INTERNAL_ERROR";
      const status = code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : code === "TIMEOUT" ? 408 : 500;
      res.status(status).json({ success: false, error: { code, message: err.message } });
      return;
    }

    const executionMs = Date.now() - start;
    res.status(200).json({ success: true, data: toQueryResult(result.value, executionMs) });
  }

  function listSources(req: Request, res: Response): void {
    const parsed = ListSourcesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
      return;
    }

    const sources = queryService.listSources(parsed.data.schema);
    res.status(200).json({ success: true, data: sources });
  }

  return { runQuery, listSources };
}
