// TableDescriptor — base descriptor shared by fact and dimension tables.
import { z } from "zod";
import { TableKindSchema } from "./types.js";
import { ColumnSchema } from "./column.js";

export const TableDescriptorSchema = z.object({
  schema: z.string().min(1),
  name: z.string().min(1),
  kind: TableKindSchema,
  columns: z.array(ColumnSchema).min(1),
  description: z.string().optional(),
  tags: z.record(z.string()).optional(),
  createdAt: z.string().optional(),
});

export type TableDescriptor = z.infer<typeof TableDescriptorSchema>;

/** Create a validated TableDescriptor. */
export function makeTable(input: unknown): TableDescriptor {
  return TableDescriptorSchema.parse(input);
}

/** Return the primary-key columns of a table. */
export function primaryKeys(table: TableDescriptor): TableDescriptor["columns"] {
  return table.columns.filter((c) => c.primaryKey);
}

/** Return true when the table has at least one primary-key column. */
export function hasPrimaryKey(table: TableDescriptor): boolean {
  return table.columns.some((c) => c.primaryKey);
}

/** Qualify a table as "schema.name". */
export function qualifiedName(table: TableDescriptor): string {
  return `${table.schema}.${table.name}`;
}
