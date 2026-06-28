// McpPrompt port interface — defines the shape of an MCP prompt handler.

/** A single message within a prompt template result. */
export interface McpPromptMessage {
  readonly role: "user" | "assistant";
  readonly content: {
    readonly type: "text";
    readonly text: string;
  };
}

/** Structured result of rendering an MCP prompt template. */
export interface McpPromptResult {
  readonly description?: string;
  readonly messages: readonly McpPromptMessage[];
}

/** Argument descriptor used in capability negotiation. */
export interface McpPromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/** Port interface every MCP prompt must satisfy. */
export interface McpPrompt {
  /** Unique prompt name used to invoke it via prompts/get. */
  readonly name: string;
  /** Human-readable description of what this prompt does. */
  readonly description: string;
  /** Declared arguments the prompt accepts. */
  readonly arguments: readonly McpPromptArgument[];
  /** Render the prompt given the caller-supplied argument values. */
  render(args: Readonly<Record<string, string>>): Promise<McpPromptResult>;
}
