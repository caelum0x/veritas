// Minimal OpenAPI 3.1 spec document for the webhook-gateway service.

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Webhook Gateway",
    version: "1.0.0",
    description: "Inbound webhook ingestion, subscription management, and delivery tracking.",
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "inbound", description: "Inbound webhook event ingestion" },
    { name: "subscriptions", description: "Webhook subscription management" },
    { name: "deliveries", description: "Webhook delivery records" },
    { name: "system", description: "Health and metrics" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["system"],
        summary: "Health check",
        operationId: "getHealth",
        security: [],
        responses: {
          "200": { description: "Service is healthy" },
          "503": { description: "Service is degraded or unhealthy" },
        },
      },
    },
    "/webhooks/inbound/{source}": {
      post: {
        tags: ["inbound"],
        summary: "Receive an inbound webhook event",
        operationId: "receiveWebhook",
        security: [],
        parameters: [
          {
            name: "source",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Event accepted" },
          "401": { description: "Signature verification failed" },
          "409": { description: "Duplicate delivery" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/webhooks/subscriptions": {
      get: {
        tags: ["subscriptions"],
        summary: "List webhook subscriptions",
        operationId: "listSubscriptions",
        security: [{ ApiKey: ["webhooks:read"] }],
        responses: { "200": { description: "List of subscriptions" } },
      },
      post: {
        tags: ["subscriptions"],
        summary: "Create a webhook subscription",
        operationId: "createSubscription",
        security: [{ ApiKey: ["webhooks:write"] }],
        responses: { "201": { description: "Subscription created" } },
      },
    },
    "/webhooks/subscriptions/{id}": {
      get: {
        tags: ["subscriptions"],
        summary: "Get a webhook subscription",
        operationId: "getSubscription",
        security: [{ ApiKey: ["webhooks:read"] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Subscription details" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["subscriptions"],
        summary: "Update a webhook subscription",
        operationId: "updateSubscription",
        security: [{ ApiKey: ["webhooks:write"] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated subscription" } },
      },
      delete: {
        tags: ["subscriptions"],
        summary: "Delete a webhook subscription",
        operationId: "deleteSubscription",
        security: [{ ApiKey: ["webhooks:write"] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/webhooks/deliveries": {
      get: {
        tags: ["deliveries"],
        summary: "List delivery records",
        operationId: "listDeliveries",
        security: [{ ApiKey: ["webhooks:read"] }],
        responses: { "200": { description: "List of delivery records" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "veritas_sk_<keyId>_<secret>",
      },
    },
  },
} as const;
