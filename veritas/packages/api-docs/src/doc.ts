// Doc model: core data structures representing a rendered API documentation page.

import type { OpenApiDocument, TagObject } from "@veritas/openapi-gen";

export interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly level: 1 | 2 | 3 | 4;
  readonly content: string;
  readonly anchor: string;
}

export interface DocEndpoint {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly summary: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
  readonly parameters: readonly DocParameter[];
  readonly requestBody: DocRequestBody | null;
  readonly responses: readonly DocResponse[];
  readonly security: readonly string[];
}

export interface DocParameter {
  readonly name: string;
  readonly location: "query" | "header" | "path" | "cookie";
  readonly description: string;
  readonly required: boolean;
  readonly deprecated: boolean;
  readonly schema: unknown;
  readonly example: unknown;
}

export interface DocRequestBody {
  readonly description: string;
  readonly required: boolean;
  readonly contentTypes: readonly string[];
  readonly schema: unknown;
}

export interface DocResponse {
  readonly statusCode: string;
  readonly description: string;
  readonly contentTypes: readonly string[];
  readonly schema: unknown;
}

export interface DocTag {
  readonly name: string;
  readonly description: string;
  readonly endpoints: readonly DocEndpoint[];
}

export interface DocInfo {
  readonly title: string;
  readonly version: string;
  readonly description: string;
  readonly termsOfService: string;
  readonly contact: { name: string; url: string; email: string } | null;
  readonly license: { name: string; url: string } | null;
}

export interface DocServer {
  readonly url: string;
  readonly description: string;
}

export interface ApiDoc {
  readonly id: string;
  readonly info: DocInfo;
  readonly servers: readonly DocServer[];
  readonly tags: readonly DocTag[];
  readonly untaggedEndpoints: readonly DocEndpoint[];
  readonly generatedAt: string;
  readonly sourceDocument: OpenApiDocument;
}

/** Build a DocInfo from OpenAPI info and server objects. */
export function makeDocInfo(doc: OpenApiDocument): DocInfo {
  const { info } = doc;
  return {
    title: info.title,
    version: info.version,
    description: info.description ?? "",
    termsOfService: info.termsOfService ?? "",
    contact: info.contact
      ? { name: info.contact.name ?? "", url: info.contact.url ?? "", email: info.contact.email ?? "" }
      : null,
    license: info.license
      ? { name: info.license.name, url: info.license.url ?? "" }
      : null,
  };
}

/** Build DocServer array from OpenAPI document servers. */
export function makeDocServers(doc: OpenApiDocument): readonly DocServer[] {
  return (doc.servers ?? []).map((s) => ({
    url: s.url,
    description: s.description ?? "",
  }));
}

/** Convert an OpenAPI TagObject to a DocTag stub (endpoints populated separately). */
export function makeDocTagStub(tag: TagObject): Omit<DocTag, "endpoints"> {
  return {
    name: tag.name,
    description: tag.description ?? "",
  };
}

/** Generate a URL-safe anchor from a string. */
export function toAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
