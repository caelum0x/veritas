// stdio: runs the MCP server over a newline-delimited JSON-RPC stdio transport.

import type { RequestHandler } from "@veritas/mcp-server";
import type { Logger } from "@veritas/observability";
import type { JsonRpcRequest } from "@veritas/mcp-server";

/**
 * Start the MCP stdio transport: reads newline-delimited JSON from stdin,
 * dispatches each request through the handler, and writes responses to stdout.
 * Resolves when stdin closes.
 */
export async function runStdio(
  handler: RequestHandler,
  logger: Logger,
): Promise<void> {
  logger.info("mcp stdio transport starting");

  process.stdin.setEncoding("utf8");
  let buffer = "";

  await new Promise<void>((resolve) => {
    process.stdin.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        void (async () => {
          try {
            const parsed: unknown = JSON.parse(trimmed);
            const req = parsed as JsonRpcRequest;
            const res = await handler.handle(req);
            process.stdout.write(JSON.stringify(res) + "\n");
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "parse error";
            logger.warn("mcp stdio: malformed line", { error: msg });
          }
        })();
      }
    });

    process.stdin.on("end", () => {
      logger.info("mcp stdio transport stopped (stdin closed)");
      resolve();
    });

    process.stdin.on("error", (err: Error) => {
      logger.error("mcp stdio transport error", { error: err.message });
      resolve();
    });
  });
}
