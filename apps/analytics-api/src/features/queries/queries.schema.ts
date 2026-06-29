// Zod schemas for query feature request/response validation.
import { z } from "zod";

export const RunQueryBodySchema = z.object({
  sql: z.string().min(1).max(8_000),
  timeoutMs: z.number().int().min(100).max(30_000).optional().default(5_000),
});

export type RunQueryBody = z.infer<typeof RunQueryBodySchema>;

export const ListSourcesQuerySchema = z.object({
  schema: z.string().optional(),
});

export type ListSourcesQuery = z.infer<typeof ListSourcesQuerySchema>;

export const QueryResultSchema = z.object({
  columns: z.array(z.object({ name: z.string(), index: z.number() })),
  rows: z.array(z.record(z.unknown())),
  totalRows: z.number(),
  returnedRows: z.number(),
  executionMs: z.number(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

export const DataSourceSummarySchema = z.object({
  key: z.string(),
  schema: z.string(),
  name: z.string(),
  rowCount: z.number(),
});

export type DataSourceSummary = z.infer<typeof DataSourceSummarySchema>;
