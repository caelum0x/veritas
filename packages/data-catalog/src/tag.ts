// Tag management — create, retrieve, and list dataset taxonomy tags.
import { Result, ok, err, newId } from "@veritas/core";
import type { Tag, CreateTag, TagId } from "./types.js";
import { tagId } from "./types.js";
import { TagNotFoundError } from "./errors.js";

export interface TagRepository {
  findById(id: TagId): Promise<Result<Tag, TagNotFoundError>>;
  findAll(): Promise<readonly Tag[]>;
  create(input: CreateTag): Promise<Tag>;
  delete(id: TagId): Promise<Result<void, TagNotFoundError>>;
}

export class InMemoryTagRepository implements TagRepository {
  private readonly store = new Map<string, Tag>();

  async findById(id: TagId): Promise<Result<Tag, TagNotFoundError>> {
    const tag = this.store.get(id as string);
    return tag ? ok(tag) : err(new TagNotFoundError(id as string));
  }

  async findAll(): Promise<readonly Tag[]> {
    return Object.freeze([...this.store.values()]);
  }

  async create(input: CreateTag): Promise<Tag> {
    const tag: Tag = {
      id: tagId(newId("tag")),
      name: input.name,
      color: input.color,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
    this.store.set(tag.id as string, tag);
    return tag;
  }

  async delete(id: TagId): Promise<Result<void, TagNotFoundError>> {
    if (!this.store.has(id as string)) return err(new TagNotFoundError(id as string));
    this.store.delete(id as string);
    return ok(undefined);
  }
}
