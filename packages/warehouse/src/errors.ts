// Domain errors for the warehouse module.
import { AppError } from "@veritas/core";

export class TableNotFoundError extends AppError {
  constructor(ref: string) {
    super("NOT_FOUND", 404, `Table not found: ${ref}`, { details: { ref } });
    this.name = "TableNotFoundError";
  }
}

export class TableAlreadyExistsError extends AppError {
  constructor(ref: string) {
    super("CONFLICT", 409, `Table already exists: ${ref}`, { details: { ref } });
    this.name = "TableAlreadyExistsError";
  }
}

export class SchemaNotFoundError extends AppError {
  constructor(name: string) {
    super("NOT_FOUND", 404, `Schema not found: ${name}`, { details: { name } });
    this.name = "SchemaNotFoundError";
  }
}

export class ColumnNotFoundError extends AppError {
  constructor(table: string, column: string) {
    super("NOT_FOUND", 404, `Column '${column}' not found in table '${table}'`, {
      details: { table, column },
    });
    this.name = "ColumnNotFoundError";
  }
}

export class InvalidQueryError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 400, `Invalid warehouse query: ${reason}`, { details: { reason } });
    this.name = "InvalidQueryError";
  }
}

export class LoadError extends AppError {
  constructor(table: string, reason: string) {
    super("INTERNAL", 500, `Failed to load data into '${table}': ${reason}`, {
      details: { table, reason },
    });
    this.name = "LoadError";
  }
}

export class PartitionError extends AppError {
  constructor(table: string, reason: string) {
    super("INTERNAL", 500, `Partition error on '${table}': ${reason}`, {
      details: { table, reason },
    });
    this.name = "PartitionError";
  }
}
