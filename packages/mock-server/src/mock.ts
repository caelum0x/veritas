// Defines the core MockDefinition type and builder utilities for mock-server.
import { z } from "zod";

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const MockResponseSchema = z.object({
  status: z.number().int().min(100).max(599).default(200),
  headers: z.record(z.string()).default({}),
  body: z.unknown().optional(),
  delay: z.number().int().min(0).default(0),
});
export type MockResponse = z.infer<typeof MockResponseSchema>;

export const MockMatcherSchema = z.object({
  method: HttpMethodSchema.optional(),
  path: z.string(),
  pathIsRegex: z.boolean().default(false),
  query: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  bodyContains: z.record(z.unknown()).optional(),
});
export type MockMatcher = z.infer<typeof MockMatcherSchema>;

export const MockDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  matcher: MockMatcherSchema,
  response: MockResponseSchema,
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  scenarioId: z.string().optional(),
  callCount: z.number().int().default(0),
  maxCalls: z.number().int().optional(),
});
export type MockDefinition = z.infer<typeof MockDefinitionSchema>;

export type CreateMockDefinition = Omit<MockDefinition, "callCount"> & { callCount?: number };

export function createMock(def: CreateMockDefinition): MockDefinition {
  return MockDefinitionSchema.parse({ callCount: 0, ...def });
}

export function incrementCallCount(mock: MockDefinition): MockDefinition {
  return { ...mock, callCount: mock.callCount + 1 };
}

export function isMockExhausted(mock: MockDefinition): boolean {
  return mock.maxCalls !== undefined && mock.callCount >= mock.maxCalls;
}
