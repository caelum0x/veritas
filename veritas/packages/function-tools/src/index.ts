// Public surface of @veritas/function-tools — function tool definitions, registry, and LLM format adapters.

export type { FunctionTool, ToolName, ToolInput, ToolOutput, ToolResult, AnthropicToolUseBlock, AnthropicToolResultBlock, AnthropicToolDefinition, OpenAIFunctionDefinition, OpenAIToolCall } from "./types.js";
export { asToolName } from "./types.js";

export { ToolNotFoundError, ToolInputError, ToolExecutionError, UnsupportedFormatError } from "./errors.js";

// Tool definition helpers
export { defineTool } from "./tool.js";

// JSON Schema generation
export { zodToJsonSchema } from "./schema.js";

// Registry
export { ToolRegistry, defaultRegistry } from "./registry.js";

// Built-in tools
export { verifyTool } from "./tools/verify.js";
export { searchSourcesTool } from "./tools/search-sources.js";
export { getTrustScoreTool } from "./tools/get-trust-score.js";

// Dispatcher
export { dispatch, dispatchAll } from "./dispatcher.js";

// Result helpers
export { toolSuccess, toolFailure, isToolSuccess, isToolFailure } from "./result.js";
export type { ToolSuccess, ToolFailure } from "./result.js";

// Format adapters
export { toAnthropicTool, toAnthropicTools, toAnthropicToolResult, toAnthropicToolResults } from "./anthropic-format.js";
export { toOpenAiTool, toOpenAiTools, toOpenAiToolMessage, toOpenAiToolMessages } from "./openai-format.js";
