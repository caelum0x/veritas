// Error types for postman-gen collection generation failures.

export class PostmanGenError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PostmanGenError";
  }
}

export class CollectionBuildError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "COLLECTION_BUILD_ERROR", context);
    this.name = "CollectionBuildError";
  }
}

export class RequestBuildError extends PostmanGenError {
  constructor(
    message: string,
    public readonly operationId?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "REQUEST_BUILD_ERROR", { ...context, operationId });
    this.name = "RequestBuildError";
  }
}

export class AuthConfigError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AUTH_CONFIG_ERROR", context);
    this.name = "AuthConfigError";
  }
}

export class SerializationError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SERIALIZATION_ERROR", context);
    this.name = "SerializationError";
  }
}

export class VariableError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VARIABLE_ERROR", context);
    this.name = "VariableError";
  }
}

export class ExampleGenerationError extends PostmanGenError {
  constructor(
    message: string,
    public readonly schemaPath?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "EXAMPLE_GENERATION_ERROR", { ...context, schemaPath });
    this.name = "ExampleGenerationError";
  }
}

/** Alias for CollectionBuildError — thrown when a collection fails validation. */
export class InvalidCollectionError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "INVALID_COLLECTION_ERROR", context);
    this.name = "InvalidCollectionError";
  }
}

/** Thrown when generation from an OpenAPI document fails. */
export class GeneratorError extends PostmanGenError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "GENERATOR_ERROR", context);
    this.name = "GeneratorError";
  }
}
