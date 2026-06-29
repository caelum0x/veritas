// DataSource port: abstract interface specialized verifiers use to query external data sources.

import { type Result } from "@veritas/core";

/** A document returned from an external data source. */
export interface SourceDocument {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Query parameters passed to a data source. */
export interface SourceQuery {
  readonly keywords: readonly string[];
  readonly maxResults: number;
  /** Optional ISO date lower bound on publishedAt. */
  readonly after?: string;
  /** Optional domain filter (e.g. "pubmed.ncbi.nlm.nih.gov"). */
  readonly domain?: string;
}

/** Port interface for querying an external data source. */
export interface DataSourcePort {
  /** Stable identifier for this source (e.g. "edgar", "pubmed", "news-api"). */
  readonly sourceId: string;
  /** Friendly display name. */
  readonly displayName: string;

  /** Search the data source and return matching documents. */
  search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>>;

  /** Retrieve a single document by its source-specific identifier. */
  fetch(id: string): Promise<Result<SourceDocument, Error>>;
}
