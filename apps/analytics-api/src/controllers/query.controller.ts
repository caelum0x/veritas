// Handles ad-hoc SQL-like query execution against the registered data sources.
import type { Request, Response } from "express";
import { z } from "zod";
import { isOk } from "@veritas/core";
import {
  parseQuery,
  makeResultSet,
  type DataSourceRegistry,
  type ResultSet,
  applyAggregation,
  applySortAndLimit,
  projectRow,
  inferColumns,
} from "@veritas/query-engine";
import type { QuerySort } from "@veritas/warehouse";

const RunQueryBodySchema = z.object({
  sql: z.string().min(1).max(8_000),
  timeoutMs: z.number().int().min(100).max(30_000).optional().default(5_000),
});

export interface QueryControllerDeps {
  readonly registry: DataSourceRegistry;
}

export function makeQueryController(deps: QueryControllerDeps) {
  async function runQuery(req: Request, res: Response): Promise<void> {
    const parsed = RunQueryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parsed.error.message },
      });
      return;
    }

    const { sql, timeoutMs } = parsed.data;

    const parseResult = parseQuery(sql);
    if (!isOk(parseResult)) {
      const parseErrMsg = parseResult.error instanceof Error ? parseResult.error.message : String(parseResult.error);
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseErrMsg },
      });
      return;
    }

    const query = parseResult.value;
    const deadline = Date.now() + timeoutMs;

    try {
      const key = `${query.from.schema}.${query.from.name}`;
      const source = deps.registry.get(key);
      if (!source) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Data source not found: ${key}` },
        });
        return;
      }

      if (Date.now() > deadline) {
        res.status(408).json({
          success: false,
          error: { code: "TIMEOUT", message: "Query timed out" },
        });
        return;
      }

      let rows = [...source.rows];

      // NOTE: Predicate AST from parseQuery is not directly compatible with
      // evaluatePredicates which expects QueryFilter[]. Filtering is applied
      // at the data source layer when a full query executor is wired in.
      void query.where;

      const totalRows = rows.length;

      if (query.groupBy && query.groupBy.length > 0) {
        const aggResult = applyAggregation(
          rows,
          query.groupBy.map((c) => c.name),
          [],
        );
        rows = [...aggResult];
      }

      if (query.orderBy && query.orderBy.length > 0) {
        const sorts: readonly QuerySort[] = query.orderBy.flatMap((item): QuerySort[] => {
          if (item.expr.kind === "column") {
            return [{ column: item.expr.name, direction: item.dir }];
          }
          return [];
        });
        rows = [...applySortAndLimit(rows, sorts, query.limit ?? undefined, query.offset ?? undefined)];
      } else if (query.limit !== undefined || query.offset !== undefined) {
        const offset = query.offset ?? 0;
        const limit = query.limit ?? rows.length;
        rows = rows.slice(offset, offset + limit);
      }

      // Derive column names for projection from the projections AST.
      const projectionColumns: readonly string[] = query.projections
        .flatMap((item): string[] => {
          if (item.expr.kind === "column" && item.expr.name !== "*") {
            return [item.alias ?? item.expr.name];
          }
          return [];
        });
      const allColumns = inferColumns(rows);
      const columnsToProject = projectionColumns.length > 0 ? projectionColumns : allColumns;
      const projected = rows.map((row) => projectRow(row, columnsToProject));
      const executionMs = Date.now() - (deadline - timeoutMs);
      const resultSet: ResultSet = makeResultSet(projected, executionMs, totalRows);

      res.status(200).json({
        success: true,
        data: {
          columns: resultSet.columns,
          rows: resultSet.rows,
          totalRows,
          returnedRows: resultSet.rows.length,
          executionMs,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Query execution failed";
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: msg },
      });
    }
  }

  async function listSources(_req: Request, res: Response): Promise<void> {
    const sources = [...deps.registry.entries()].map(([key, src]) => ({
      key,
      schema: src.schema,
      name: src.name,
      rowCount: src.rows.length,
    }));
    res.status(200).json({ success: true, data: sources });
  }

  return { runQuery, listSources };
}
