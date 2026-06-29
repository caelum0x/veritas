// In-memory inverted index with BM25-lite scoring
import { makePage, type Page } from "@veritas/core";
import type { SearchIndex } from "./index-port.js";
import type { IndexedDocument } from "./document.js";
import type { SearchQuery } from "./query.js";
import {
  type SearchResult,
  type CorpusStats,
  scoreDocument,
  rankResults,
} from "./ranking.js";
import { tokenizeField } from "./tokenizer.js";

interface PostingEntry {
  readonly docId: string;
  readonly freq: number;
}

type PostingList = Map<string, PostingEntry>;

interface StoredDoc {
  readonly doc: IndexedDocument;
  readonly fieldLengths: Record<string, number>;
  readonly termFreqs: Map<string, number>;
}

function extractFieldText(doc: IndexedDocument, fields?: readonly string[]): Record<string, unknown> {
  if (!fields || fields.length === 0) return doc.fields;
  return Object.fromEntries(
    fields.filter((f) => f in doc.fields).map((f) => [f, doc.fields[f]])
  );
}

function buildTermFreqs(
  doc: IndexedDocument,
  fields?: readonly string[]
): { termFreqs: Map<string, number>; fieldLengths: Record<string, number> } {
  const relevant = extractFieldText(doc, fields);
  const termFreqs = new Map<string, number>();
  const fieldLengths: Record<string, number> = {};

  for (const [field, value] of Object.entries(relevant)) {
    const tokens = tokenizeField(value);
    fieldLengths[field] = tokens.length;
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
    }
  }

  return { termFreqs, fieldLengths };
}

export class MemorySearchIndex implements SearchIndex {
  private readonly docs = new Map<string, StoredDoc>();
  private readonly invertedIndex = new Map<string, PostingList>();
  private readonly indexFields: readonly string[] | undefined;

  constructor(fields?: readonly string[]) {
    this.indexFields = fields;
  }

  async add(doc: IndexedDocument): Promise<void> {
    if (this.docs.has(doc.id)) {
      await this.remove(doc.id);
    }
    const { termFreqs, fieldLengths } = buildTermFreqs(doc, this.indexFields);
    this.docs.set(doc.id, { doc, fieldLengths, termFreqs });

    for (const [term, freq] of termFreqs) {
      let postings = this.invertedIndex.get(term);
      if (!postings) {
        postings = new Map();
        this.invertedIndex.set(term, postings);
      }
      postings.set(doc.id, { docId: doc.id, freq });
    }
  }

  async addMany(docs: readonly IndexedDocument[]): Promise<void> {
    for (const doc of docs) {
      await this.add(doc);
    }
  }

  async remove(id: string): Promise<boolean> {
    const stored = this.docs.get(id);
    if (!stored) return false;

    for (const term of stored.termFreqs.keys()) {
      const postings = this.invertedIndex.get(term);
      if (postings) {
        postings.delete(id);
        if (postings.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }

    this.docs.delete(id);
    return true;
  }

  async search(query: SearchQuery): Promise<Page<SearchResult>> {
    if (query.terms.length === 0) {
      const all = this.applyFilters([...this.docs.values()], query.filters);
      const results = all.map((s) => ({
        id: s.doc.id,
        score: 1,
        doc: s.doc,
        highlights: {},
      }));
      return this.paginate(results, query);
    }

    const stats = this.buildStats();
    const candidateIds = this.getCandidates(query);

    if (candidateIds.size === 0) {
      return makePage([], null);
    }

    const totalFieldLen = this.computeTotalFieldLength();
    const avgFieldLength = stats.docCount > 0 ? totalFieldLen / stats.docCount : 0;

    const scored: SearchResult[] = [];
    for (const id of candidateIds) {
      const stored = this.docs.get(id);
      if (!stored) continue;

      const fieldLen = Object.values(stored.fieldLengths).reduce((a, b) => a + b, 0);
      const raw = scoreDocument(query.terms, stored.termFreqs, fieldLen, avgFieldLength, stats);

      if (raw >= query.minScore) {
        scored.push({ id, score: raw, doc: stored.doc, highlights: {} });
      }
    }

    const filtered = this.applyFilters(
      scored.map((r) => this.docs.get(r.id)!),
      query.filters
    ).map((s) => scored.find((r) => r.id === s.doc.id)!);

    const ranked = rankResults(filtered);

    // Normalize scores
    const maxScore = ranked[0]?.score ?? 1;
    const normalized = ranked.map((r) =>
      Object.freeze({ ...r, score: maxScore > 0 ? r.score / maxScore : 0 })
    );

    return this.paginate(normalized, query);
  }

  async clear(): Promise<void> {
    this.docs.clear();
    this.invertedIndex.clear();
  }

  size(): number {
    return this.docs.size;
  }

  private getCandidates(query: SearchQuery): Set<string> {
    const sets = query.terms.map((term) => {
      const postings = this.invertedIndex.get(term);
      return postings ? new Set(postings.keys()) : new Set<string>();
    });

    if (sets.length === 0) return new Set();

    if (query.operator === "AND") {
      const [first, ...rest] = sets;
      const result = new Set(first);
      for (const s of rest) {
        for (const id of result) {
          if (!s.has(id)) result.delete(id);
        }
      }
      return result;
    }

    // OR
    const result = new Set<string>();
    for (const s of sets) {
      for (const id of s) result.add(id);
    }
    return result;
  }

  private buildStats(): CorpusStats {
    const docCount = this.docs.size;
    const docFreq = new Map<string, number>();
    for (const [term, postings] of this.invertedIndex) {
      docFreq.set(term, postings.size);
    }
    return { docCount, avgFieldLength: {}, docFreq };
  }

  private computeTotalFieldLength(): number {
    let total = 0;
    for (const stored of this.docs.values()) {
      total += Object.values(stored.fieldLengths).reduce((a, b) => a + b, 0);
    }
    return total;
  }

  private applyFilters(
    storedDocs: readonly StoredDoc[],
    filters?: Record<string, unknown>
  ): readonly StoredDoc[] {
    if (!filters || Object.keys(filters).length === 0) return storedDocs;
    return storedDocs.filter((s) => {
      for (const [key, value] of Object.entries(filters)) {
        const field = s.doc.fields[key] ?? s.doc.meta?.[key];
        if (field !== value) return false;
      }
      return true;
    });
  }

  private paginate(results: readonly SearchResult[], query: SearchQuery): Page<SearchResult> {
    const { pageSize, cursor } = query;
    let startIdx = 0;

    if (cursor) {
      const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
      const idx = parseInt(decoded, 10);
      if (!isNaN(idx)) startIdx = idx;
    }

    const slice = results.slice(startIdx, startIdx + pageSize);
    const nextIdx = startIdx + pageSize;
    const nextCursor =
      nextIdx < results.length
        ? Buffer.from(String(nextIdx)).toString("base64url")
        : null;

    return makePage(slice, nextCursor);
  }
}
