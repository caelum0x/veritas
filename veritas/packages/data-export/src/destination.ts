// Port interface and in-memory implementation for export destinations.
import { z } from "zod";
import { type Result, ok, err, newId } from "@veritas/core";
import { DestinationKindSchema, type DestinationKind } from "./types.js";
import { DestinationNotFoundError, ExportConflictError } from "./errors.js";

export const DestinationCredentialsSchema = z.record(z.string(), z.string());
export type DestinationCredentials = z.infer<typeof DestinationCredentialsSchema>;

export const DestinationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: DestinationKindSchema,
  baseUri: z.string(),
  credentials: DestinationCredentialsSchema,
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Destination = z.infer<typeof DestinationSchema>;

export const CreateDestinationSchema = DestinationSchema.pick({
  name: true,
  kind: true,
  baseUri: true,
}).extend({
  credentials: DestinationCredentialsSchema.default({}),
});
export type CreateDestination = z.infer<typeof CreateDestinationSchema>;

export interface DestinationPort {
  create(input: CreateDestination): Promise<Result<Destination, DestinationNotFoundError | ExportConflictError>>;
  findById(id: string): Promise<Result<Destination, DestinationNotFoundError>>;
  findAll(): Promise<Result<readonly Destination[], never>>;
  update(id: string, patch: Partial<Pick<Destination, "name" | "baseUri" | "credentials" | "active">>): Promise<Result<Destination, DestinationNotFoundError>>;
  remove(id: string): Promise<Result<void, DestinationNotFoundError>>;
  /** Verify connectivity to destination without writing data. */
  ping(id: string): Promise<Result<boolean, DestinationNotFoundError>>;
}

export class InMemoryDestinationStore implements DestinationPort {
  private readonly store = new Map<string, Destination>();

  async create(input: CreateDestination): Promise<Result<Destination, ExportConflictError>> {
    const now = new Date().toISOString();
    const dest: Destination = {
      id: newId("dest"),
      name: input.name,
      kind: input.kind as DestinationKind,
      baseUri: input.baseUri,
      credentials: input.credentials ?? {},
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(dest.id, dest);
    return ok(dest);
  }

  async findById(id: string): Promise<Result<Destination, DestinationNotFoundError>> {
    const dest = this.store.get(id);
    if (dest === undefined) return err(new DestinationNotFoundError(id));
    return ok(dest);
  }

  async findAll(): Promise<Result<readonly Destination[], never>> {
    return ok(Array.from(this.store.values()));
  }

  async update(
    id: string,
    patch: Partial<Pick<Destination, "name" | "baseUri" | "credentials" | "active">>,
  ): Promise<Result<Destination, DestinationNotFoundError>> {
    const existing = this.store.get(id);
    if (existing === undefined) return err(new DestinationNotFoundError(id));
    const updated: Destination = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return ok(updated);
  }

  async remove(id: string): Promise<Result<void, DestinationNotFoundError>> {
    if (!this.store.has(id)) return err(new DestinationNotFoundError(id));
    this.store.delete(id);
    return ok(undefined);
  }

  async ping(id: string): Promise<Result<boolean, DestinationNotFoundError>> {
    if (!this.store.has(id)) return err(new DestinationNotFoundError(id));
    // In-memory: always reachable
    return ok(true);
  }
}
