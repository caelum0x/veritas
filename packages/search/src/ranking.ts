// BM25-lite ranking — scores documents by term frequency and inverse document frequency
import type { IndexedDocument } from "./document.js";

export interface SearchResult {
  readonly id: string;
  readonly score: number;
  readonly doc: IndexedDocument;
  readonly highlights: Record<string, string>;
}

export interface TermFreq {
  readonly docId: string;
  readonly freq: number;
  readonly fieldLengths: Record<string, number>;
}

export interface CorpusStats {
  readonly docCount: number;
  readonly avgFieldLength: Record<string, number>;
  readonly docFreq: Map<string, number>;
}

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export function computeIdf(docFreq: number, docCount: number): number {
  return Math.log((docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
}

export function computeTf(
  termFreq: number,
  fieldLength: number,
  avgFieldLength: number
): number {
  const norm = 1 - BM25_B + BM25_B * (fieldLength / Math.max(avgFieldLength, 1));
  return (termFreq * (BM25_K1 + 1)) / (termFreq + BM25_K1 * norm);
}

export function scoreDocument(
  terms: readonly string[],
  termFreqsForDoc: Map<string, number>,
  fieldLength: number,
  avgFieldLength: number,
  stats: CorpusStats
): number {
  let score = 0;
  for (const term of terms) {
    const tf = termFreqsForDoc.get(term) ?? 0;
    if (tf === 0) continue;
    const df = stats.docFreq.get(term) ?? 0;
    const idf = computeIdf(df, stats.docCount);
    const tfScore = computeTf(tf, fieldLength, avgFieldLength);
    score += idf * tfScore;
  }
  return score;
}

export function rankResults(results: readonly SearchResult[]): readonly SearchResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}
