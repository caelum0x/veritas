// arXiv data source port + mock: preprint search and metadata retrieval via arXiv API.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** arXiv-specific metadata for preprints. */
export interface ArxivPaperMetadata {
  readonly arxivId: string;
  readonly categories: readonly string[];
  readonly primaryCategory: string;
  readonly version: number;
  readonly doi?: string;
  readonly journalRef?: string;
  readonly isPeerReviewed: boolean;
}

/** Extended port for arXiv preprint queries. */
export interface ArxivDataSourcePort extends DataSourcePort {
  /** Fetch a preprint by its arXiv ID (e.g. "2303.08774"). */
  fetchByArxivId(arxivId: string): Promise<Result<SourceDocument, Error>>;
  /** Search within a specific arXiv category (e.g. "cs.AI", "physics.quant-ph"). */
  searchByCategory(category: string, keywords: readonly string[], maxResults?: number): Promise<Result<readonly SourceDocument[], Error>>;
}

const ARXIV_API_BASE = "https://export.arxiv.org/api/query";

/** Live arXiv adapter using the official Atom-based API. */
export class ArxivDataSource implements ArxivDataSourcePort {
  readonly sourceId = "arxiv";
  readonly displayName = "arXiv";

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const terms = query.keywords.map((kw) => `all:${kw}`).join("+AND+");
      const params = new URLSearchParams({
        search_query: terms,
        max_results: String(query.maxResults),
        sortBy: "relevance",
        sortOrder: "descending",
      });
      const url = `${ARXIV_API_BASE}?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return err(new Error(`arXiv search HTTP ${res.status}`));
      const text = await res.text();
      return ok(parseArxivAtom(text));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    return this.fetchByArxivId(id);
  }

  async fetchByArxivId(arxivId: string): Promise<Result<SourceDocument, Error>> {
    try {
      const params = new URLSearchParams({ id_list: arxivId });
      const url = `${ARXIV_API_BASE}?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`arXiv fetch HTTP ${res.status}`));
      const text = await res.text();
      const docs = parseArxivAtom(text);
      if (docs.length === 0) return err(new Error(`arXiv: paper not found: ${arxivId}`));
      return ok(docs[0]!);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async searchByCategory(category: string, keywords: readonly string[], maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    const catTerm = `cat:${category}`;
    const keyTerms = keywords.map((kw) => `all:${kw}`).join("+AND+");
    const combined = keyTerms ? `${catTerm}+AND+${keyTerms}` : catTerm;
    try {
      const params = new URLSearchParams({
        search_query: combined,
        max_results: String(maxResults),
        sortBy: "submittedDate",
        sortOrder: "descending",
      });
      const url = `${ARXIV_API_BASE}?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return err(new Error(`arXiv category search HTTP ${res.status}`));
      const text = await res.text();
      return ok(parseArxivAtom(text));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

function parseArxivAtom(xml: string): readonly SourceDocument[] {
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const docs: SourceDocument[] = [];
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1] ?? "";
    const doc = parseArxivEntry(entry);
    if (doc) docs.push(doc);
  }
  return docs;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s");
  return re.exec(xml)?.[1]?.trim() ?? "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  return re.exec(xml)?.[1]?.trim() ?? "";
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gs");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const val = m[1]?.trim();
    if (val) results.push(val);
  }
  return results;
}

function parseArxivEntry(entry: string): SourceDocument | null {
  const rawId = extractTag(entry, "id");
  if (!rawId) return null;
  const arxivId = rawId.replace("http://arxiv.org/abs/", "").replace("https://arxiv.org/abs/", "");
  const versionMatch = /v(\d+)$/.exec(arxivId);
  const version = versionMatch ? parseInt(versionMatch[1]!, 10) : 1;
  const cleanId = arxivId.replace(/v\d+$/, "");
  const title = extractTag(entry, "title").replace(/\s+/g, " ");
  const summary = extractTag(entry, "summary").replace(/\s+/g, " ").slice(0, 300);
  const published = extractTag(entry, "published").slice(0, 10);
  const authorTags = extractAllTags(entry, "author");
  const authors = authorTags
    .slice(0, 3)
    .map((a) => extractTag(a, "name"))
    .filter(Boolean)
    .join(", ");
  const primaryCategory = extractAttr(entry, "arxiv:primary_category", "term");
  const allCategories = entry.match(/<category[^>]*term="([^"]+)"/g)
    ?.map((c) => /term="([^"]+)"/.exec(c)?.[1] ?? "")
    .filter(Boolean) ?? [];
  const doi = extractTag(entry, "arxiv:doi");
  const journalRef = extractTag(entry, "arxiv:journal_ref");
  return {
    id: cleanId,
    url: `https://arxiv.org/abs/${cleanId}`,
    title,
    snippet: authors ? `${summary} — Authors: ${authors}` : summary,
    publishedAt: published || null,
    metadata: {
      arxivId: cleanId,
      categories: allCategories,
      primaryCategory,
      version,
      doi: doi || undefined,
      journalRef: journalRef || undefined,
      isPeerReviewed: Boolean(journalRef || doi),
    } satisfies ArxivPaperMetadata,
  };
}

/** In-memory mock arXiv source for tests and local development. */
export class MockArxivDataSource extends MockDataSource implements ArxivDataSourcePort {
  constructor() {
    super("arxiv", "arXiv (mock)", ARXIV_SEED);
  }

  async fetchByArxivId(arxivId: string): Promise<Result<SourceDocument, Error>> {
    return this.fetch(arxivId);
  }

  async searchByCategory(category: string, keywords: readonly string[], maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [category, ...keywords], maxResults });
  }
}

const ARXIV_SEED = [
  {
    id: "1706.03762",
    url: "https://arxiv.org/abs/1706.03762",
    title: "Attention Is All You Need",
    snippet: "We propose the Transformer, a model architecture based entirely on attention mechanisms. — Authors: Vaswani, A., Shazeer, N., Parmar, N.",
    publishedAt: "2017-06-12",
    tags: ["attention", "transformer", "neural network", "nlp", "machine learning", "self-attention"],
    metadata: {
      arxivId: "1706.03762",
      categories: ["cs.CL", "cs.LG"],
      primaryCategory: "cs.CL",
      version: 5,
      isPeerReviewed: false,
    } satisfies ArxivPaperMetadata,
  },
  {
    id: "2303.08774",
    url: "https://arxiv.org/abs/2303.08774",
    title: "GPT-4 Technical Report",
    snippet: "We report the development of GPT-4, a large-scale multimodal model. — Authors: OpenAI",
    publishedAt: "2023-03-15",
    tags: ["gpt-4", "large language model", "llm", "multimodal", "openai"],
    metadata: {
      arxivId: "2303.08774",
      categories: ["cs.CL", "cs.AI"],
      primaryCategory: "cs.CL",
      version: 6,
      isPeerReviewed: false,
    } satisfies ArxivPaperMetadata,
  },
  {
    id: "2005.14165",
    url: "https://arxiv.org/abs/2005.14165",
    title: "Language Models are Few-Shot Learners",
    snippet: "We describe GPT-3, which achieves strong performance on many NLP tasks. — Authors: Brown, T., Mann, B., Ryder, N.",
    publishedAt: "2020-05-28",
    tags: ["gpt-3", "few-shot", "language model", "nlp", "openai", "in-context learning"],
    metadata: {
      arxivId: "2005.14165",
      categories: ["cs.CL"],
      primaryCategory: "cs.CL",
      version: 3,
      isPeerReviewed: false,
    } satisfies ArxivPaperMetadata,
  },
  {
    id: "1512.03385",
    url: "https://arxiv.org/abs/1512.03385",
    title: "Deep Residual Learning for Image Recognition",
    snippet: "We present a residual learning framework to ease training of deep neural networks. — Authors: He, K., Zhang, X., Ren, S.",
    publishedAt: "2015-12-10",
    tags: ["resnet", "residual", "deep learning", "image recognition", "convolutional", "computer vision"],
    metadata: {
      arxivId: "1512.03385",
      categories: ["cs.CV"],
      primaryCategory: "cs.CV",
      version: 1,
      doi: "10.1109/CVPR.2016.90",
      isPeerReviewed: true,
    } satisfies ArxivPaperMetadata,
  },
];

/** Factory that returns a live or mock arXiv source. */
export function createArxivSource(mock = false): ArxivDataSourcePort {
  return mock ? new MockArxivDataSource() : new ArxivDataSource();
}
