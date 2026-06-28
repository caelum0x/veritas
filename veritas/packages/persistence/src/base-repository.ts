// BaseRepository<T> interface defining standard CRUD operations for all repositories.
import type { Result } from "@veritas/core";
import type { QueryOptions } from "./query.js";
import type { Page } from "@veritas/core";

/** Generic base repository interface all domain repositories extend. */
export interface BaseRepository<T, CreateDto = Omit<T, "id" | "createdAt" | "updatedAt">, UpdateDto = Partial<CreateDto>> {
  /** Find a single entity by its opaque ID string. */
  findById(id: string): Promise<Result<T>>;

  /** List entities with optional filtering, sorting, and pagination. */
  list(options?: QueryOptions<T>): Promise<Result<Page<T>>>;

  /** Persist a new entity and return the created record. */
  create(dto: CreateDto): Promise<Result<T>>;

  /** Apply a partial update to an existing entity by ID. */
  update(id: string, dto: UpdateDto): Promise<Result<T>>;

  /** Remove an entity by ID. Returns the deleted entity. */
  delete(id: string): Promise<Result<T>>;
}
