// Column type descriptors for warehouse table schemas.
import { z } from "zod";

export const ColumnTypeSchema = z.enum([
  "string",
  "integer",
  "float",
  "boolean",
  "timestamp",
  "date",
  "json",
  "uuid",
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const ColumnSchema = z.object({
  name: z.string().min(1),
  type: ColumnTypeSchema,
  nullable: z.boolean().default(false),
  primaryKey: z.boolean().default(false),
  unique: z.boolean().default(false),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
});

export type Column = z.infer<typeof ColumnSchema>;

export function makeColumn(
  name: string,
  type: ColumnType,
  opts: Partial<Omit<Column, "name" | "type">> = {}
): Column {
  return ColumnSchema.parse({ name, type, ...opts });
}

export function pkColumn(name: string, type: ColumnType = "uuid"): Column {
  return makeColumn(name, type, { primaryKey: true, nullable: false });
}

export function timestampColumn(name: string): Column {
  return makeColumn(name, "timestamp", { nullable: false });
}

export function nullableColumn(name: string, type: ColumnType): Column {
  return makeColumn(name, type, { nullable: true });
}

export function isCompatible(value: unknown, col: Column): boolean {
  if (value === null || value === undefined) return col.nullable;
  switch (col.type) {
    case "string":
    case "uuid":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "float":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "timestamp":
    case "date":
      return (
        typeof value === "string" ||
        value instanceof Date ||
        typeof value === "number"
      );
    case "json":
      return true;
  }
}
