// Dataset ownership — track which team or user owns a catalog asset.
import { Result, ok, err, newId } from "@veritas/core";
import type { Owner, CreateOwner, OwnerId, DatasetId } from "./types.js";
import { ownerId } from "./types.js";
import { OwnerNotFoundError } from "./errors.js";

export interface OwnerRepository {
  findById(id: OwnerId): Promise<Result<Owner, OwnerNotFoundError>>;
  findAll(): Promise<readonly Owner[]>;
  create(input: CreateOwner): Promise<Owner>;
}

export class InMemoryOwnerRepository implements OwnerRepository {
  private readonly store = new Map<string, Owner>();

  async findById(id: OwnerId): Promise<Result<Owner, OwnerNotFoundError>> {
    const owner = this.store.get(id as string);
    return owner ? ok(owner) : err(new OwnerNotFoundError(id as string));
  }

  async findAll(): Promise<readonly Owner[]> {
    return Object.freeze([...this.store.values()]);
  }

  async create(input: CreateOwner): Promise<Owner> {
    const owner: Owner = {
      id: ownerId(newId("owner")),
      name: input.name,
      email: input.email,
      team: input.team,
      createdAt: new Date().toISOString(),
    };
    this.store.set(owner.id as string, owner);
    return owner;
  }
}
