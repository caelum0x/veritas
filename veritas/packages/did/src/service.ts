// DID service endpoint types as defined in W3C DID Core spec.
import type { Did } from "./did.js";

/** A single service endpoint value (URL or structured object). */
export type ServiceEndpointValue = string | Record<string, unknown> | readonly (string | Record<string, unknown>)[];

/** A DID service entry embedded in a DID Document. */
export interface DidService {
  readonly id: string;
  readonly type: string | readonly string[];
  readonly serviceEndpoint: ServiceEndpointValue;
  readonly [key: string]: unknown;
}

/** Well-known service type constants. */
export const SERVICE_TYPES = {
  LINKED_DOMAINS: "LinkedDomains",
  DID_COMM_MESSAGING: "DIDCommMessaging",
  CREDENTIAL_REGISTRY: "CredentialRegistry",
  VERIFICATION_SERVICE: "VerificationService",
  OPENID_CONNECT: "OpenIdConnectVersion1.0Service",
} as const;

/** Build a minimal DID service entry. */
export function makeService(
  id: string,
  type: string,
  serviceEndpoint: ServiceEndpointValue,
  extra: Record<string, unknown> = {},
): DidService {
  return Object.freeze({ id, type, serviceEndpoint, ...extra });
}

/** Resolve the first string endpoint from a service (unwrap arrays). */
export function firstEndpointUrl(service: DidService): string | null {
  const ep = service.serviceEndpoint;
  if (typeof ep === "string") return ep;
  if (Array.isArray(ep)) {
    const first = ep[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "uri" in first) {
      return String((first as Record<string, unknown>)["uri"]);
    }
    return null;
  }
  if (typeof ep === "object" && ep !== null && "uri" in ep) {
    return String((ep as Record<string, unknown>)["uri"]);
  }
  return null;
}
