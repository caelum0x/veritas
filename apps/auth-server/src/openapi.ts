// OpenAPI 3.1 specification document for @veritas/auth-server.

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Veritas Auth Server",
    version: "1.0.0",
    description: "Authentication, SSO, MFA, and session management for the Veritas platform.",
  },
  servers: [{ url: "/", description: "Auth server" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        operationId: "healthCheck",
        responses: {
          "200": { description: "Service is healthy or degraded" },
          "503": { description: "Service is unhealthy" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Password-based login",
        operationId: "login",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          "200": { description: "Session token issued", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          "401": { description: "Invalid credentials" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/auth/sso/{providerId}/initiate": {
      get: {
        summary: "Initiate SSO login flow",
        operationId: "ssoInitiate",
        parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "302": { description: "Redirect to Identity Provider" },
          "404": { description: "Provider not found" },
        },
      },
    },
    "/auth/sso/{providerId}/callback": {
      get: {
        summary: "SSO callback from Identity Provider",
        operationId: "ssoCallback",
        parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "SSO login successful" },
          "400": { description: "Invalid callback parameters" },
          "401": { description: "Authentication failed" },
        },
      },
    },
    "/auth/mfa/enroll": {
      post: {
        summary: "Enroll an MFA factor",
        operationId: "mfaEnroll",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "MFA factor enrolled" }, "401": { description: "Unauthenticated" } },
      },
    },
    "/auth/mfa/verify": {
      post: {
        summary: "Verify an MFA challenge",
        operationId: "mfaVerify",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "MFA verified" }, "401": { description: "Unauthenticated" }, "422": { description: "Invalid OTP" } },
      },
    },
    "/auth/sessions": {
      get: {
        summary: "List active sessions",
        operationId: "listSessions",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Session list" }, "401": { description: "Unauthenticated" } },
      },
    },
    "/auth/sessions/{sessionId}": {
      delete: {
        summary: "Revoke a session",
        operationId: "revokeSession",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Session revoked" }, "401": { description: "Unauthenticated" }, "404": { description: "Session not found" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
          organizationId: { type: "string" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: {
            type: "object",
            properties: {
              token: { type: "string" },
              expiresAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
} as const;
