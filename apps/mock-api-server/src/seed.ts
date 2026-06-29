// Seed functions that populate the mock registry with default Veritas domain mocks.
import { createMock, type MockDefinition, registerMock } from "@veritas/mock-server";
import type { Registry } from "@veritas/mock-server";

const now = new Date().toISOString();

const exampleUser = {
  id: "usr_seed_001",
  email: "demo@veritas.dev",
  displayName: "Demo User",
  createdAt: now,
  updatedAt: now,
};

const exampleOrg = {
  id: "org_seed_001",
  name: "Demo Org",
  slug: "demo-org",
  createdAt: now,
  updatedAt: now,
};

const exampleClaim = {
  id: "clm_seed_001",
  text: "The Earth is round.",
  status: "pending",
  sourceId: "src_seed_001",
  createdAt: now,
  updatedAt: now,
};

const exampleSource = {
  id: "src_seed_001",
  url: "https://example.com/article",
  title: "Example Article",
  tier: "standard",
  trustScore: 0.85,
  createdAt: now,
  updatedAt: now,
};

const exampleVerification = {
  id: "ver_seed_001",
  claimId: "clm_seed_001",
  verdict: "true",
  confidence: 0.92,
  createdAt: now,
  updatedAt: now,
};

function jsonBody(body: unknown, status = 200): MockDefinition["response"] {
  return { status, headers: { "content-type": "application/json" }, body, delay: 0 };
}

function okBody(data: unknown): MockDefinition["response"] {
  return jsonBody({ success: true, data, error: null });
}

function createdBody(data: unknown): MockDefinition["response"] {
  return jsonBody({ success: true, data, error: null }, 201);
}

function pageBody(items: readonly unknown[], total: number): MockDefinition["response"] {
  return jsonBody({
    success: true,
    data: items,
    error: null,
    meta: { total, page: 1, limit: 20, totalPages: 1 },
  });
}

function makeMock(
  id: string,
  name: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  response: MockDefinition["response"],
  priority = 0,
): MockDefinition {
  return createMock({
    id,
    name,
    matcher: { method, path, pathIsRegex: false },
    response,
    priority,
    enabled: true,
  });
}

function getDefaultMocks(): readonly MockDefinition[] {
  return [
    makeMock("seed-health", "GET /health", "GET", "/health", okBody({ status: "ok", version: "1.0.0" }), 10),
    makeMock("seed-users-list", "GET /v1/users", "GET", "/v1/users", pageBody([exampleUser], 1)),
    makeMock("seed-users-create", "POST /v1/users", "POST", "/v1/users", createdBody(exampleUser)),
    makeMock("seed-users-get", "GET /v1/users/:id", "GET", "/v1/users/:id", okBody(exampleUser)),
    makeMock("seed-users-update", "PATCH /v1/users/:id", "PATCH", "/v1/users/:id", okBody(exampleUser)),
    makeMock("seed-orgs-list", "GET /v1/organizations", "GET", "/v1/organizations", pageBody([exampleOrg], 1)),
    makeMock("seed-orgs-create", "POST /v1/organizations", "POST", "/v1/organizations", createdBody(exampleOrg)),
    makeMock("seed-orgs-get", "GET /v1/organizations/:id", "GET", "/v1/organizations/:id", okBody(exampleOrg)),
    makeMock("seed-sources-list", "GET /v1/sources", "GET", "/v1/sources", pageBody([exampleSource], 1)),
    makeMock("seed-sources-create", "POST /v1/sources", "POST", "/v1/sources", createdBody(exampleSource)),
    makeMock("seed-sources-get", "GET /v1/sources/:id", "GET", "/v1/sources/:id", okBody(exampleSource)),
    makeMock("seed-claims-list", "GET /v1/claims", "GET", "/v1/claims", pageBody([exampleClaim], 1)),
    makeMock("seed-claims-create", "POST /v1/claims", "POST", "/v1/claims", createdBody(exampleClaim)),
    makeMock("seed-claims-get", "GET /v1/claims/:id", "GET", "/v1/claims/:id", okBody(exampleClaim)),
    makeMock(
      "seed-verifications-list",
      "GET /v1/verifications",
      "GET",
      "/v1/verifications",
      pageBody([exampleVerification], 1),
    ),
    makeMock(
      "seed-verifications-create",
      "POST /v1/verifications",
      "POST",
      "/v1/verifications",
      createdBody(exampleVerification),
    ),
    makeMock(
      "seed-verifications-get",
      "GET /v1/verifications/:id",
      "GET",
      "/v1/verifications/:id",
      okBody(exampleVerification),
    ),
  ];
}

export function seedMockData(registry: Registry): Registry {
  let next = registry;
  for (const mock of getDefaultMocks()) {
    next = registerMock(next, mock);
  }
  return next;
}
