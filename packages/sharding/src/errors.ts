// Sharding-specific error types extending AppError conventions.

import { AppError } from "@veritas/core";

export class ShardNotFoundError extends AppError {
  constructor(shardId: string) {
    super("NOT_FOUND", 404, "Shard not found", { message: `Shard not found: ${shardId}` });
    this.name = "ShardNotFoundError";
  }
}

export class ShardKeyError extends AppError {
  constructor(detail: string) {
    super("VALIDATION", 422, "Invalid shard key", { message: `Invalid shard key: ${detail}` });
    this.name = "ShardKeyError";
  }
}

export class ShardRegistryError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, "Shard registry error", { message: `Shard registry error: ${detail}` });
    this.name = "ShardRegistryError";
  }
}

export class MigrationError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, "Migration error", { message: `Migration error: ${detail}` });
    this.name = "MigrationError";
  }
}

export class RingError extends AppError {
  constructor(detail: string) {
    super("INTERNAL", 500, "Consistent hash ring error", { message: `Consistent hash ring error: ${detail}` });
    this.name = "RingError";
  }
}
