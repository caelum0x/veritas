// Business glossary: manage canonical term definitions for the data catalog.
import { z } from "zod";
import { Result, ok, err, newId, ValidationError } from "@veritas/core";
import { AppError } from "@veritas/core";
import type { GlossaryTermId, DatasetId } from "./types.js";
import { glossaryTermId } from "./types.js";
import { GlossaryTermNotFoundError, GlossaryTermConflictError } from "./errors.js";

export const CreateGlossaryTermSchema = z.object({
  term: z.string().min(1).max(200),
  definition: z.string().min(1).max(2000),
  aliases: z.array(z.string().min(1).max(200)).default([]),
  relatedTermIds: z.array(z.string()).default([]),
  linkedDatasetIds: z.array(z.string()).default([]),
  owner: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type CreateGlossaryTerm = z.infer<typeof CreateGlossaryTermSchema>;

export const UpdateGlossaryTermSchema = CreateGlossaryTermSchema.partial();
export type UpdateGlossaryTerm = z.infer<typeof UpdateGlossaryTermSchema>;

export interface GlossaryTerm {
  readonly id: GlossaryTermId;
  readonly term: string;
  readonly definition: string;
  readonly aliases: ReadonlyArray<string>;
  readonly relatedTermIds: ReadonlyArray<GlossaryTermId>;
  readonly linkedDatasetIds: ReadonlyArray<DatasetId>;
  readonly owner?: string;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GlossaryPort {
  createTerm(input: CreateGlossaryTerm): Promise<Result<GlossaryTerm, AppError>>;
  getTerm(id: GlossaryTermId): Promise<Result<GlossaryTerm, AppError>>;
  updateTerm(id: GlossaryTermId, input: UpdateGlossaryTerm): Promise<Result<GlossaryTerm, AppError>>;
  deleteTerm(id: GlossaryTermId): Promise<Result<void, AppError>>;
  listTerms(): Promise<Result<ReadonlyArray<GlossaryTerm>, AppError>>;
  findByTerm(term: string): Promise<Result<GlossaryTerm | undefined, AppError>>;
}

export class InMemoryGlossary implements GlossaryPort {
  private readonly store: Map<GlossaryTermId, GlossaryTerm> = new Map();
  private readonly byName: Map<string, GlossaryTermId> = new Map();

  async createTerm(input: CreateGlossaryTerm): Promise<Result<GlossaryTerm, AppError>> {
    const parsed = CreateGlossaryTermSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));

    const normalized = parsed.data.term.toLowerCase();
    if (this.byName.has(normalized)) return err(new GlossaryTermConflictError(parsed.data.term));

    const now = new Date().toISOString();
    const id = glossaryTermId(newId("gterm"));
    const term: GlossaryTerm = {
      id,
      term: parsed.data.term,
      definition: parsed.data.definition,
      aliases: parsed.data.aliases,
      relatedTermIds: parsed.data.relatedTermIds.map(r => glossaryTermId(r)),
      linkedDatasetIds: parsed.data.linkedDatasetIds as unknown as DatasetId[],
      owner: parsed.data.owner,
      tags: parsed.data.tags,
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(id, term);
    this.byName.set(normalized, id);
    return ok(term);
  }

  async getTerm(id: GlossaryTermId): Promise<Result<GlossaryTerm, AppError>> {
    const term = this.store.get(id);
    if (!term) return err(new GlossaryTermNotFoundError(id));
    return ok(term);
  }

  async updateTerm(id: GlossaryTermId, input: UpdateGlossaryTerm): Promise<Result<GlossaryTerm, AppError>> {
    const existing = this.store.get(id);
    if (!existing) return err(new GlossaryTermNotFoundError(id));

    const parsed = UpdateGlossaryTermSchema.safeParse(input);
    if (!parsed.success) return err(new ValidationError({ message: parsed.error.message }));

    if (parsed.data.term && parsed.data.term.toLowerCase() !== existing.term.toLowerCase()) {
      const normalized = parsed.data.term.toLowerCase();
      if (this.byName.has(normalized)) return err(new GlossaryTermConflictError(parsed.data.term));
      this.byName.delete(existing.term.toLowerCase());
      this.byName.set(normalized, id);
    }

    const updated: GlossaryTerm = {
      ...existing,
      ...(parsed.data.term !== undefined ? { term: parsed.data.term } : {}),
      ...(parsed.data.definition !== undefined ? { definition: parsed.data.definition } : {}),
      ...(parsed.data.aliases !== undefined ? { aliases: parsed.data.aliases } : {}),
      ...(parsed.data.relatedTermIds !== undefined ? { relatedTermIds: parsed.data.relatedTermIds.map(r => glossaryTermId(r)) } : {}),
      ...(parsed.data.linkedDatasetIds !== undefined ? { linkedDatasetIds: parsed.data.linkedDatasetIds as unknown as DatasetId[] } : {}),
      ...(parsed.data.owner !== undefined ? { owner: parsed.data.owner } : {}),
      ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.store.set(id, updated);
    return ok(updated);
  }

  async deleteTerm(id: GlossaryTermId): Promise<Result<void, AppError>> {
    const existing = this.store.get(id);
    if (!existing) return err(new GlossaryTermNotFoundError(id));
    this.store.delete(id);
    this.byName.delete(existing.term.toLowerCase());
    return ok(undefined);
  }

  async listTerms(): Promise<Result<ReadonlyArray<GlossaryTerm>, AppError>> {
    return ok(Array.from(this.store.values()));
  }

  async findByTerm(term: string): Promise<Result<GlossaryTerm | undefined, AppError>> {
    const id = this.byName.get(term.toLowerCase());
    if (!id) return ok(undefined);
    return ok(this.store.get(id));
  }
}
