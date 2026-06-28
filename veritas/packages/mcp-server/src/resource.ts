// McpResource port interface — defines the shape of an MCP resource handler.

/** A single MCP resource item returned in a resource list. */
export interface McpResourceItem {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** The result of reading an MCP resource. */
export interface McpResourceContent {
  readonly uri: string;
  readonly mimeType: string;
  readonly text: string;
}

/** Result envelope for a resource read operation. */
export interface McpResourceResult {
  readonly contents: readonly McpResourceContent[];
}

/** Port interface every MCP resource must satisfy. */
export interface McpResource {
  /** URI template this resource handles (e.g. "veritas://reports/{id}"). */
  readonly uriTemplate: string;
  /** Human-readable name shown in capability negotiation. */
  readonly name: string;
  /** Short description of what this resource exposes. */
  readonly description: string;
  /** List all available resource items under this template. */
  list(): Promise<readonly McpResourceItem[]>;
  /** Read the resource identified by the given URI. */
  read(uri: string): Promise<McpResourceResult>;
}
