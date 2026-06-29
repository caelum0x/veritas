// HTTP GraphQL server: handles POST /graphql requests with context injection
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { graphql, GraphQLSchema } from "graphql";
import type { Logger } from "@veritas/observability";
import type { ContextFactory, GqlContext } from "./context.js";
import { formatError } from "./errors.js";

export interface GraphQLServerOptions {
  readonly schema: GraphQLSchema;
  readonly context: ContextFactory;
  readonly logger: Logger;
  readonly port: number;
  readonly path?: string;
}

interface GraphQLRequestBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

function isRequestBody(value: unknown): value is GraphQLRequestBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof (value as Record<string, unknown>)["query"] === "string"
  );
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: GraphQLServerOptions,
  gqlPath: string,
): Promise<void> {
  sendCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] ?? "/";
  if (url !== gqlPath) {
    sendJson(res, 404, { errors: [{ message: "Not found" }] });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { errors: [{ message: "Method not allowed" }] });
    return;
  }

  let rawBody: string;
  try {
    rawBody = await readBody(req);
  } catch {
    sendJson(res, 400, { errors: [{ message: "Failed to read request body" }] });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { errors: [{ message: "Invalid JSON body" }] });
    return;
  }

  if (!isRequestBody(body)) {
    sendJson(res, 400, { errors: [{ message: "Missing required field: query" }] });
    return;
  }

  let ctx: GqlContext;
  try {
    ctx = await opts.context(req);
  } catch (err: unknown) {
    opts.logger.error("Context creation failed", { error: String(err) });
    sendJson(res, 500, { errors: [{ message: "Internal server error" }] });
    return;
  }

  const result = await graphql({
    schema: opts.schema,
    source: body.query,
    variableValues: body.variables ?? {},
    operationName: body.operationName,
    contextValue: ctx,
  });

  const formatted = {
    ...result,
    errors: result.errors?.map((e: import("graphql").GraphQLError) => formatError(e, e.originalError)),
  };

  const status = result.errors !== undefined && result.errors.length > 0 ? 200 : 200;
  sendJson(res, status, formatted);
}

export interface GraphQLServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Create an HTTP GraphQL server bound to the given options. */
export function createGraphQLServer(opts: GraphQLServerOptions): GraphQLServer {
  const gqlPath = opts.path ?? "/graphql";

  const httpServer = createServer((req, res) => {
    handleRequest(req, res, opts, gqlPath).catch((err: unknown) => {
      opts.logger.error("Unhandled request error", { error: String(err) });
      if (!res.headersSent) {
        sendJson(res, 500, { errors: [{ message: "Internal server error" }] });
      }
    });
  });

  return {
    start(): Promise<void> {
      return new Promise<void>((resolve) => {
        httpServer.listen(opts.port, () => {
          opts.logger.info("GraphQL server started", { port: opts.port, path: gqlPath });
          resolve();
        });
      });
    },
    stop(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err !== undefined) {
            reject(err);
          } else {
            opts.logger.info("GraphQL server stopped");
            resolve();
          }
        });
      });
    },
  };
}
