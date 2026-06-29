// Header policy: add, remove, and override HTTP headers on requests/responses

import { z } from "zod";

export const HeaderMutationSchema = z.object({
  set: z.record(z.string(), z.string()).default({}),
  append: z.record(z.string(), z.string()).default({}),
  remove: z.array(z.string()).default([]),
});

export type HeaderMutation = z.infer<typeof HeaderMutationSchema>;

export const HeaderPolicySchema = z.object({
  request: HeaderMutationSchema.default({}),
  response: HeaderMutationSchema.default({}),
});

export type HeaderPolicy = z.infer<typeof HeaderPolicySchema>;

export type HeaderMap = Readonly<Record<string, string>>;

export function applyMutation(
  headers: Readonly<Record<string, string>>,
  mutation: HeaderMutation,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = { ...headers };

  for (const key of mutation.remove) {
    delete result[key.toLowerCase()];
  }

  for (const [key, value] of Object.entries(mutation.set)) {
    result[key.toLowerCase()] = value;
  }

  for (const [key, value] of Object.entries(mutation.append)) {
    const lower = key.toLowerCase();
    const existing = result[lower];
    result[lower] = existing !== undefined ? `${existing}, ${value}` : value;
  }

  return Object.freeze(result);
}

export function applyRequestPolicy(
  headers: Readonly<Record<string, string>>,
  policy: HeaderPolicy,
): Readonly<Record<string, string>> {
  return applyMutation(headers, policy.request);
}

export function applyResponsePolicy(
  headers: Readonly<Record<string, string>>,
  policy: HeaderPolicy,
): Readonly<Record<string, string>> {
  return applyMutation(headers, policy.response);
}

export function securityHeaders(): Readonly<Record<string, string>> {
  return Object.freeze({
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
}

export function defaultHeaderPolicy(): HeaderPolicy {
  return HeaderPolicySchema.parse({});
}
