// Query service: parses SQL, executes against DataSourceRegistry, returns ResultSet.
import { isOk, err, ok, type Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import {
  parseQuery,
  makeResultSet,
  applyAggregation,
  applySortAndLimit,
  projectRow,
  inferColumns,
  type DataSourceRegistry,
  type ResultSet,
} from "@veritas/query-engine";
import type { QuerySort } from "@veritas/warehouse";
import type { Logger } from "@veritas/observability";

export interface QueryServiceDeps {
  readonly registry: DataSourceRegistry;
  readonly logger: Logger;
}

export interface RunQueryInput {
  readonly sql: string;
  readonly timeoutMs: number;
}

export class QueryService {
  readonly #registry: DataSourceRegistry;
  readonly #logger: Logger;

  constructor(deps: QueryServiceDeps) {
    this.#registry = deps.registry;
    this.#logger = deps.logger;
  }

  async runQuery(input: RunQueryInput): Promise<Result<ResultSet, AppError>> {
    const { sql, timeoutMs } = input;
    const deadline = Date.now() + timeoutMs;

    const parseResult = parseQuery(sql);
    if (!isOk(parseResult)) {
      return err({
        code: "VALIDATION_ERROR",
        message: parseResult.error instanceof Error ? parseResult.error.message : String(parseResult.error),
      } as unknown as AppError);
    }

    const query = parseResult.value;
    const key = `${query.from.schema}.${query.from.name}`;
    const source = this.#registry.get(key);

    if (!source) {
      return err({
        code: "NOT_FOUND",
        message: `Data source not found: ${key}`,
      } as unknown as AppError);
    }

    if (Date.now() > deadline) {
      return err({
        code: "TIMEOUT",
        message: "Query timed out before execution",
      } as unknown as AppError);
    }

    this.#logger.info("queries.service: executing query", { source: key });

    let rows = [...source.rows];
    const totalRows = rows.length;

    if (query.groupBy && query.groupBy.length > 0) {
      const groupCols = query.groupBy.map((c) => c.name);
      rows = [...applyAggregation(rows, groupCols, [])];
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

    const projectionColumns = query.projections.flatMap((item): string[] => {
      if (item.expr.kind === "column" && item.expr.name !== "*") {
        return [item.alias ?? item.expr.name];
      }
      return [];
    });

    const allColumns = inferColumns(rows);
    const columnsToProject = projectionColumns.length > 0 ? projectionColumns : allColumns;
    const projected = rows.map((row) => projectRow(row, columnsToProject));
    const executionMs = Date.now() - (deadline - timeoutMs);
    const resultSet = makeResultSet(projected, executionMs, totalRows);

    return ok(resultSet);
  }

  listSources(schemaFilter?: string): readonly { key: string; schema: string; name: string; rowCount: number }[] {
    return [...this.#registry.entries()]
      .filter(([, src]) => (schemaFilter ? src.schema === schemaFilter : true))
      .map(([key, src]) => ({ key, schema: src.schema, name: src.name, rowCount: src.rows.length }));
  }
}
