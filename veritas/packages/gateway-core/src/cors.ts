// CORS policy configuration and evaluation for gateway routes

import { z } from "zod";

export const CorsOptionsSchema = z.object({
  allowedOrigins: z.array(z.string()).default(["*"]),
  allowedMethods: z.array(z.string()).default(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
  allowedHeaders: z.array(z.string()).default(["Content-Type", "Authorization"]),
  exposedHeaders: z.array(z.string()).default([]),
  allowCredentials: z.boolean().default(false),
  maxAge: z.number().int().nonnegative().default(86400),
});

export type CorsOptions = z.infer<typeof CorsOptionsSchema>;

export interface CorsResult {
  readonly allowed: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly preflight: boolean;
}

function matchOrigin(origin: string, allowed: readonly string[]): boolean {
  if (allowed.includes("*")) return true;
  return allowed.some((pattern) => {
    if (pattern.includes("*")) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      return new RegExp(`^${escaped}$`).test(origin);
    }
    return pattern === origin;
  });
}

export function evaluateCors(
  options: CorsOptions,
  requestOrigin: string | undefined,
  requestMethod: string,
): CorsResult {
  if (requestOrigin === undefined) {
    return { allowed: true, headers: {}, preflight: false };
  }

  const originAllowed = matchOrigin(requestOrigin, options.allowedOrigins);
  if (!originAllowed) {
    return { allowed: false, headers: {}, preflight: false };
  }

  const isPreflight = requestMethod.toUpperCase() === "OPTIONS";
  const originHeader = options.allowedOrigins.includes("*") && !options.allowCredentials
    ? "*"
    : requestOrigin;

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": originHeader,
  };

  if (options.allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (options.exposedHeaders.length > 0) {
    headers["Access-Control-Expose-Headers"] = options.exposedHeaders.join(", ");
  }

  if (isPreflight) {
    headers["Access-Control-Allow-Methods"] = options.allowedMethods.join(", ");
    headers["Access-Control-Allow-Headers"] = options.allowedHeaders.join(", ");
    headers["Access-Control-Max-Age"] = String(options.maxAge);
  }

  return { allowed: true, headers: Object.freeze(headers), preflight: isPreflight };
}

export function defaultCorsOptions(): CorsOptions {
  return CorsOptionsSchema.parse({});
}
