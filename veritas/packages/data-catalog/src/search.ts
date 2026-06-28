// Catalog search: full-text and faceted search over datasets and glossary terms.
import { Result, ok, err, Page, makePage } from "@veritas/core";
import { AppError } from "@veritas/core";
import type { DatasetId, TagId, OwnerId, GlossaryTermId } from "./types.js";

export interface DatasetSearchResult {
  readonly id: DatasetId;
  readonly name: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
  readonly ownerName: string;
  readonly score: number;
}

export interface GlossarySearchResult {
  readonly id: GlossaryTermId;
  readonly term: string;
  readonly definition: string;
  readonly score: number;
}

export interface SearchFilters {
  readonly tags?: ReadonlyArray<TagId>;
  readonly ownerId?: OwnerId;
  readonly format?: string;
  readonly createdAfter?: string;
  readonly createdBefore?: string;
}

export interface SearchQuery {
  readonly q: string;
  readonly filters?: SearchFilters;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface CatalogSearchPort {
  searchDatasets(query: SearchQuery): Promise<Result<Page<DatasetSearchResult>, AppError>>;
  searchGlossary(query: SearchQuery): Promise<Result<Page<GlossarySearchResult>, AppError>>;
  searchAll(query: SearchQuery): Promise<Result<{ datasets: readonly DatasetSearchResult[]; terms: readonly GlossarySearchResult[] }, AppError>>;
}

function scoreText(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 1.0;
  if (lower.startsWith(q)) return 0.8;
  if (lower.includes(q)) return 0.6;
  const words = q.split(/\s+/);
  const matched = words.filter(w => lower.includes(w)).length;
  return matched / words.length * 0.4;
}

export interface IndexedDataset {
  readonly id: DatasetId;
  readonly name: string;
  readonly description: string;
  readonly tags: ReadonlyArray<{ id: TagId; name: string }>;
  readonly ownerId: OwnerId;
  readonly ownerName: string;
  readonly format?: string;
  readonly createdAt: string;
}

export interface IndexedGlossaryTerm {
  readonly id: GlossaryTermId;
  readonly term: string;
  readonly definition: string;
  readonly aliases: ReadonlyArray<string>;
}

export class InMemoryCatalogSearch implements CatalogSearchPort {
  private readonly datasets: Map<DatasetId, IndexedDataset> = new Map();
  private readonly terms: Map<GlossaryTermId, IndexedGlossaryTerm> = new Map();

  indexDataset(dataset: IndexedDataset): void {
    this.datasets.set(dataset.id, dataset);
  }

  removeDataset(id: DatasetId): void {
    this.datasets.delete(id);
  }

  indexTerm(term: IndexedGlossaryTerm): void {
    this.terms.set(term.id, term);
  }

  removeTerm(id: GlossaryTermId): void {
    this.terms.delete(id);
  }

  async searchDatasets(query: SearchQuery): Promise<Result<Page<DatasetSearchResult>, AppError>> {
    const limit = Math.min(query.limit ?? 20, 100);
    const results: DatasetSearchResult[] = [];

    for (const ds of this.datasets.values()) {
      if (!this.matchesFilters(ds, query.filters)) continue;
      const score = this.scoreDataset(ds, query.q);
      if (score > 0 || query.q.trim() === "") {
        results.push({
          id: ds.id,
          name: ds.name,
          description: ds.description,
          tags: ds.tags.map(t => t.name),
          ownerName: ds.ownerName,
          score: query.q.trim() === "" ? 1 : score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const page = makePage(results.slice(0, limit), null);
    return ok(page);
  }

  async searchGlossary(query: SearchQuery): Promise<Result<Page<GlossarySearchResult>, AppError>> {
    const limit = Math.min(query.limit ?? 20, 100);
    const results: GlossarySearchResult[] = [];

    for (const term of this.terms.values()) {
      const score = this.scoreTerm(term, query.q);
      if (score > 0 || query.q.trim() === "") {
        results.push({
          id: term.id,
          term: term.term,
          definition: term.definition,
          score: query.q.trim() === "" ? 1 : score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const page = makePage(results.slice(0, limit), null);
    return ok(page);
  }

  async searchAll(query: SearchQuery): Promise<Result<{ datasets: readonly DatasetSearchResult[]; terms: readonly GlossarySearchResult[] }, AppError>> {
    const [dsResult, termResult] = await Promise.all([
      this.searchDatasets(query),
      this.searchGlossary(query),
    ]);
    if (dsResult.ok === false) return err(dsResult.error);
    if (termResult.ok === false) return err(termResult.error);
    return ok({ datasets: dsResult.value.items, terms: termResult.value.items });
  }

  private matchesFilters(ds: IndexedDataset, filters?: SearchFilters): boolean {
    if (!filters) return true;
    if (filters.ownerId && ds.ownerId !== filters.ownerId) return false;
    if (filters.format && ds.format !== filters.format) return false;
    if (filters.tags && filters.tags.length > 0) {
      const dsTagIds = new Set(ds.tags.map(t => t.id));
      if (!filters.tags.every(tid => dsTagIds.has(tid))) return false;
    }
    if (filters.createdAfter && ds.createdAt < filters.createdAfter) return false;
    if (filters.createdBefore && ds.createdAt > filters.createdBefore) return false;
    return true;
  }

  private scoreDataset(ds: IndexedDataset, q: string): number {
    if (q.trim() === "") return 1;
    const nameScore = scoreText(ds.name, q) * 1.5;
    const descScore = scoreText(ds.description, q);
    const tagScore = ds.tags.reduce((best, t) => Math.max(best, scoreText(t.name, q)), 0) * 0.8;
    return Math.min(nameScore + descScore + tagScore, 1);
  }

  private scoreTerm(term: IndexedGlossaryTerm, q: string): number {
    if (q.trim() === "") return 1;
    const termScore = scoreText(term.term, q) * 1.5;
    const defScore = scoreText(term.definition, q);
    const aliasScore = term.aliases.reduce((best, a) => Math.max(best, scoreText(a, q)), 0) * 0.8;
    return Math.min(termScore + defScore + aliasScore, 1);
  }
}
