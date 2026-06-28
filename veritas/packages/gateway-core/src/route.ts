// Gateway route descriptor: defines how incoming requests are matched and forwarded.
import { z } from "zod";

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const RouteMatchSchema = z.object({
  path: z.string().min(1),
  methods: z.array(HttpMethodSchema).min(1).optional(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
});
export type RouteMatch = z.infer<typeof RouteMatchSchema>;

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  backoffMs: z.number().int().min(0).default(200),
  retryOn: z.array(z.number().int()).default([502, 503, 504]),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const TimeoutPolicySchema = z.object({
  connectMs: z.number().int().min(1).default(5000),
  readMs: z.number().int().min(1).default(30000),
});
export type TimeoutPolicy = z.infer<typeof TimeoutPolicySchema>;

export const RouteSchema = z.object({
  id: z.string().min(1),
  match: RouteMatchSchema,
  upstreamId: z.string().min(1),
  stripPrefix: z.string().optional(),
  addPrefix: z.string().optional(),
  requireAuth: z.boolean().default(false),
  rateLimit: z
    .object({
      requests: z.number().int().min(1),
      windowMs: z.number().int().min(1),
    })
    .optional(),
  retry: RetryPolicySchema.optional(),
  timeout: TimeoutPolicySchema.optional(),
  corsEnabled: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});
export type Route = z.infer<typeof RouteSchema>;

export const CreateRouteSchema = RouteSchema.omit({});
export type CreateRoute = z.infer<typeof CreateRouteSchema>;

/** Rewrite a request path by stripping and/or adding a prefix. */
export function rewritePath(
  original: string,
  stripPrefix: string | undefined,
  addPrefix: string | undefined
): string {
  let path = original;
  if (stripPrefix && path.startsWith(stripPrefix)) {
    path = path.slice(stripPrefix.length) || "/";
  }
  if (addPrefix) {
    path = addPrefix + (path.startsWith("/") ? path : `/${path}`);
  }
  return path;
}
