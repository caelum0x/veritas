// http: runs the MCP server over an HTTP transport with JSON-RPC POST endpoint.

import * as http from "node:http";
import type { RequestHandler } from "@veritas/mcp-server";
import type { JsonRpcRequest } from "@veritas/mcp-server";
import type { Logger } from "@veritas/observability";
import { buildHealthStatus } from "./health.js";

const JSON_CONTENT_TYPE = "application/json";
const MAX_BODY_BYTES = 1_048_576; // 1 MiB

/** Parse the raw request body as UTF-8 string with a size guard. */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body exceeds 1 MiB limit"));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** Write a JSON response with the given status code. */
function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": JSON_CONTENT_TYPE,
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Start the MCP HTTP transport: serves JSON-RPC 2.0 on POST /mcp
 * and a liveness probe on GET /health. Resolves when the server closes.
 */
export async function runHttp(
  handler: RequestHandler,
  logger: Logger,
  host: string,
  port: number,
  serverVersion: string,
): Promise<void> {
  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    // Liveness probe
    if (method === "GET" && url === "/health") {
      const health = buildHealthStatus(serverVersion);
      writeJson(res, 200, health);
      return;
    }

    // MCP JSON-RPC endpoint
    if (method === "POST" && url === "/mcp") {
      let body: string;
      try {
        body = await readBody(req);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "read error";
        writeJson(res, 400, { error: msg });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        writeJson(res, 400, { error: "Invalid JSON" });
        return;
      }

      try {
        const rpcReq = parsed as JsonRpcRequest;
        const rpcRes = await handler.handle(rpcReq);
        writeJson(res, 200, rpcRes);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "internal error";
        logger.error("mcp http: handler error", { error: msg });
        writeJson(res, 500, { error: msg });
      }
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  });

  await new Promise<void>((resolve, reject) => {
    server.on("error", (err) => {
      logger.error("mcp http server error", { error: err.message });
      reject(err);
    });

    server.listen(port, host, () => {
      logger.info("mcp http transport listening", { host, port });
    });

    process.on("SIGINT", () => {
      logger.info("mcp http transport stopping (SIGINT)");
      server.close(() => resolve());
    });

    process.on("SIGTERM", () => {
      logger.info("mcp http transport stopping (SIGTERM)");
      server.close(() => resolve());
    });
  });
}
