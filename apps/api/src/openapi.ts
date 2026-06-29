// OpenAPI 3.1 spec registration: serves the spec at /openapi.json.
import type { Router } from "express";

const SPEC: Record<string, unknown> = {
  openapi: "3.1.0",
  info: {
    title: "Veritas API",
    version: "1.0.0",
    description: "Enterprise fact-verification and commerce platform.",
  },
  servers: [{ url: "/v1" }],
  paths: {},
};

/** Mount the OpenAPI JSON spec on the given router. */
export function registerOpenApiRoute(router: Router): void {
  router.get("/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(SPEC);
  });
}
