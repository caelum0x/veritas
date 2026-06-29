// Core type definitions for the api-docs module.

import type { OpenApiDocument, OperationObject, TagObject } from "@veritas/openapi-gen";

export type DocFormat = "markdown" | "html";

export interface DocConfig {
  readonly title: string;
  readonly description?: string;
  readonly baseUrl?: string;
  readonly format: DocFormat;
  readonly includeExamples: boolean;
  readonly includeToc: boolean;
  readonly includeSearch: boolean;
  readonly logoUrl?: string;
  readonly faviconUrl?: string;
  readonly themeColor?: string;
}

export interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly level: number;
  readonly tag?: string;
}

export interface DocPage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly sections: readonly DocSection[];
  readonly meta?: Record<string, string>;
}

export interface DocSite {
  readonly config: DocConfig;
  readonly pages: readonly DocPage[];
  readonly document: OpenApiDocument;
  readonly generatedAt: string;
}

export interface ExtractedExample {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly requestExample?: unknown;
  readonly responseExamples: readonly ResponseExample[];
  readonly description?: string;
}

export interface ResponseExample {
  readonly statusCode: string;
  readonly contentType: string;
  readonly value: unknown;
  readonly summary?: string;
}

export interface TocEntry {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly level: number;
  readonly children: readonly TocEntry[];
  readonly tag?: string;
}

export interface TableOfContents {
  readonly entries: readonly TocEntry[];
}

export interface SearchRecord {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly slug: string;
  readonly tags: readonly string[];
  readonly type: SearchRecordType;
  readonly operationId?: string;
  readonly method?: string;
  readonly path?: string;
}

export type SearchRecordType = "operation" | "schema" | "guide" | "tag";

export interface SearchIndex {
  readonly records: readonly SearchRecord[];
  readonly version: string;
  readonly generatedAt: string;
}

export interface OperationDoc {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly operation: OperationObject;
  readonly tag?: TagObject;
}
