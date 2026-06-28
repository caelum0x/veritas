// Registry-specific error types for the @veritas/registry-onchain package

import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when a registry entry cannot be found by its ID */
export class RegistryEntryNotFoundError extends AppError {
  constructor(registryId: string, options?: AppErrorOptions) {
    super("NOT_FOUND", 404, `Registry entry not found: ${registryId}`, options);
    this.name = "RegistryEntryNotFoundError";
  }
}

/** Raised when an address is already registered in the on-chain registry */
export class AlreadyRegisteredError extends AppError {
  constructor(address: string, options?: AppErrorOptions) {
    super("CONFLICT", 409, `Address already registered: ${address}`, options);
    this.name = "AlreadyRegisteredError";
  }
}

/** Raised when a registry write transaction fails or reverts */
export class RegistryWriteError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Registry write failed: ${message}`, options);
    this.name = "RegistryWriteError";
  }
}

/** Raised when a registry read operation fails */
export class RegistryReadError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("INTERNAL", 500, `Registry read failed: ${message}`, options);
    this.name = "RegistryReadError";
  }
}

/** Raised when registry sync with on-chain state fails */
export class RegistrySyncError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super("UNAVAILABLE", 503, `Registry sync failed: ${message}`, options);
    this.name = "RegistrySyncError";
  }
}

/** Raised when attempting to update a deregistered entry */
export class RegistryEntryDeregisteredError extends AppError {
  constructor(registryId: string, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Registry entry is deregistered and cannot be modified: ${registryId}`,
      options
    );
    this.name = "RegistryEntryDeregisteredError";
  }
}

/** Raised when registry operation is attempted with an invalid status transition */
export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      422,
      `Invalid status transition: ${from} -> ${to}`,
      options
    );
    this.name = "InvalidStatusTransitionError";
  }
}
