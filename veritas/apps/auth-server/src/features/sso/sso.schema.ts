// Zod schemas for SSO feature request/response shapes.

import { z } from "zod";

export const SsoInitiateRequestSchema = z.object({
  providerId: z.string().min(1, "providerId is required"),
  relayState: z.string().optional(),
});
export type SsoInitiateRequest = z.infer<typeof SsoInitiateRequestSchema>;

export const SsoCallbackQuerySchema = z.object({
  providerId: z.string().min(1).optional(),
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  RelayState: z.string().optional(),
  SAMLResponse: z.string().optional(),
});
export type SsoCallbackQuery = z.infer<typeof SsoCallbackQuerySchema>;

export const SsoAuthResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  sessionId: z.string(),
});
export type SsoAuthResponse = z.infer<typeof SsoAuthResponseSchema>;

export const SsoProviderListItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  protocol: z.enum(["saml", "oidc", "oauth2"]),
});
export type SsoProviderListItem = z.infer<typeof SsoProviderListItemSchema>;
