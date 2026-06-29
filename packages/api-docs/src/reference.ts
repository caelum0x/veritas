// API Reference builder: assembles multi-format documentation from an OpenApiDocument.

import type { OpenApiDocument } from "@veritas/openapi-gen";
import type { ApiDoc } from "./doc.js";
import { generateDoc } from "./generator.js";
import { renderMarkdown } from "./markdown.js";
import { renderHtml } from "./html.js";

export type ReferenceFormat = "html" | "markdown" | "json";

export interface ReferenceOutput {
  readonly format: ReferenceFormat;
  readonly content: string;
  readonly doc: ApiDoc;
  readonly generatedAt: string;
}

export interface ReferenceOptions {
  readonly formats?: readonly ReferenceFormat[];
}

const DEFAULT_FORMATS: readonly ReferenceFormat[] = ["html", "markdown", "json"];

function renderFormat(doc: ApiDoc, format: ReferenceFormat): string {
  switch (format) {
    case "html":
      return renderHtml(doc);
    case "markdown":
      return renderMarkdown(doc);
    case "json":
      return JSON.stringify(doc.sourceDocument, null, 2);
  }
}

export interface ApiReference {
  /** The structured doc model. */
  readonly doc: ApiDoc;
  /** Render in a specific format. */
  render(format: ReferenceFormat): string;
  /** Render all requested formats. */
  renderAll(): readonly ReferenceOutput[];
}

/** Build an API reference from a raw OpenApiDocument. */
export function buildReference(
  openApiDoc: OpenApiDocument,
  options: ReferenceOptions = {},
): ApiReference {
  const formats = options.formats ?? DEFAULT_FORMATS;
  const doc = generateDoc(openApiDoc);

  return {
    doc,
    render(format: ReferenceFormat): string {
      return renderFormat(doc, format);
    },
    renderAll(): readonly ReferenceOutput[] {
      return formats.map((format) => ({
        format,
        content: renderFormat(doc, format),
        doc,
        generatedAt: doc.generatedAt,
      }));
    },
  };
}

/** Convenience: generate HTML reference string directly. */
export function generateHtmlReference(openApiDoc: OpenApiDocument): string {
  return buildReference(openApiDoc, { formats: ["html"] }).render("html");
}

/** Convenience: generate Markdown reference string directly. */
export function generateMarkdownReference(openApiDoc: OpenApiDocument): string {
  return buildReference(openApiDoc, { formats: ["markdown"] }).render("markdown");
}
