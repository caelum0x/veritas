// OpenAPI specification builder for the developer portal API.
import type { Request, Response } from "express";

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Developer Portal API",
    version: "1.0.0",
    description: "API for managing developer applications, API keys, usage analytics, and partner integrations.",
  },
  servers: [{ url: "/v1", description: "API v1" }],
  tags: [
    { name: "apps", description: "Developer application management" },
    { name: "keys", description: "API key management" },
    { name: "usage", description: "Usage analytics" },
    { name: "partners", description: "Partner management" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description: "Veritas API key (veritas_sk_...)",
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {},
} as const;

export function openapiHandler(_req: Request, res: Response): void {
  res.status(200).json(OPENAPI_SPEC);
}
