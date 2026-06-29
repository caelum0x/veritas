// Zod validation schemas for mock and scenario HTTP request/response bodies.
import { z } from "zod";
import {
  HttpMethodSchema,
  MockMatcherSchema,
  MockResponseSchema,
} from "@veritas/mock-server";

export const CreateMockBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  matcher: MockMatcherSchema,
  response: MockResponseSchema,
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  scenarioId: z.string().optional(),
  maxCalls: z.number().int().positive().optional(),
});
export type CreateMockBody = z.infer<typeof CreateMockBodySchema>;

export const UpdateMockBodySchema = z.object({
  name: z.string().min(1).optional(),
  matcher: MockMatcherSchema.optional(),
  response: MockResponseSchema.optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  maxCalls: z.number().int().positive().optional(),
});
export type UpdateMockBody = z.infer<typeof UpdateMockBodySchema>;

export const CreateScenarioBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().default(false),
  mockIds: z.array(z.string()).default([]),
});
export type CreateScenarioBody = z.infer<typeof CreateScenarioBodySchema>;

export const ResolveRequestBodySchema = z.object({
  method: HttpMethodSchema,
  path: z.string().min(1),
  query: z.record(z.string()).default({}),
  headers: z.record(z.string()).default({}),
  body: z.unknown().optional(),
});
export type ResolveRequestBody = z.infer<typeof ResolveRequestBodySchema>;

export const MockIdParamSchema = z.object({ mockId: z.string().min(1) });
export const ScenarioIdParamSchema = z.object({ scenarioId: z.string().min(1) });
