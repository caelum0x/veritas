// HTTP server lifecycle: create, start, and stop with connection draining.
import http from "node:http";
import type { Express } from "express";

export function createServer(app: Express): http.Server {
  return http.createServer(app);
}

export async function startServer(
  server: http.Server,
  port: number,
  host = "0.0.0.0",
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
}

export async function stopServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err?: Error) => (err ? reject(err) : resolve()));
  });
}
