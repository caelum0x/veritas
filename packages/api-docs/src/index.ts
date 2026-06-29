// Public surface of @veritas/api-docs: re-exports all modules for consumers.

export type {
  DocSection,
  DocEndpoint,
  DocParameter,
  DocRequestBody,
  DocResponse,
  DocTag,
  DocInfo,
  DocServer,
  ApiDoc,
} from "./doc.js";

export { makeDocInfo, makeDocServers, makeDocTagStub, toAnchor } from "./doc.js";

export { generateDoc } from "./generator.js";

export { renderMarkdown } from "./markdown.js";

export { renderHtml } from "./html.js";

export type { ReferenceOptions, ReferenceFormat, ReferenceOutput, ApiReference } from "./reference.js";
export { buildReference, generateHtmlReference, generateMarkdownReference } from "./reference.js";

export type { ExtractedExample, ResponseExample } from "./types.js";
export { extractExamples, extractExampleForOperation } from "./example-extractor.js";

export type { TocEntry, TableOfContents } from "./types.js";
export { buildTableOfContents, flattenToc } from "./toc.js";

export type { SearchRecord, SearchIndex, SearchRecordType } from "./types.js";
export { buildSearchIndex, searchRecords } from "./search-index.js";

export { ApiDocsError, DocGenerationError, ExampleExtractionError, RenderError, TocBuildError, SearchIndexError } from "./errors.js";

export type { DocFormat, DocConfig, DocPage, DocSite, OperationDoc } from "./types.js";
