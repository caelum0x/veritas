// Domain errors for the data-catalog module.
import { AppError, NotFoundError, ConflictError, ValidationError } from "@veritas/core";

export class DatasetNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Dataset not found: ${id}`, details: { id } });
  }
}

export class DatasetConflictError extends ConflictError {
  constructor(name: string) {
    super({ message: `Dataset already exists: ${name}`, details: { name } });
  }
}

export class TagNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Tag not found: ${id}`, details: { id } });
  }
}

export class OwnerNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Owner not found: ${id}`, details: { id } });
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(detail: string) {
    super({ message: `Schema validation failed: ${detail}` });
  }
}

export class GlossaryTermNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Glossary term not found: ${id}`, details: { id } });
  }
}

export class GlossaryTermConflictError extends ConflictError {
  constructor(name: string) {
    super({ message: `Glossary term already exists: ${name}`, details: { name } });
  }
}

export class RegistryEntryNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Registry entry not found: ${id}`, details: { id } });
  }
}
