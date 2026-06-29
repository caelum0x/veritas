// Gateway URL builder: resolves CIDs to public HTTP gateway URLs.

import type { CID } from "./cid.js";

/** Well-known public IPFS HTTP gateway base URLs. */
export const KNOWN_GATEWAYS = [
  "https://ipfs.io",
  "https://cloudflare-ipfs.com",
  "https://dweb.link",
  "https://gateway.pinata.cloud",
] as const;

export type GatewayUrl = string;

/** Configuration for a gateway resolver. */
export interface GatewayConfig {
  /** Base URL of the gateway (no trailing slash). */
  readonly baseUrl: string;
  /** Path template; use {cid} as placeholder. Defaults to "/ipfs/{cid}". */
  readonly pathTemplate?: string;
}

const DEFAULT_PATH_TEMPLATE = "/ipfs/{cid}";

/** Build a gateway URL for a given CID using the provided config. */
export function buildGatewayUrl(cid: CID, config: GatewayConfig): GatewayUrl {
  const template = config.pathTemplate ?? DEFAULT_PATH_TEMPLATE;
  const cidStr = cid.slice("bafk:".length).replace(/:/g, "-");
  const path = template.replace("{cid}", cidStr);
  const base = config.baseUrl.replace(/\/$/, "");
  return `${base}${path}`;
}

/** Build gateway URLs for a CID across all known public gateways. */
export function buildPublicGatewayUrls(cid: CID): ReadonlyArray<GatewayUrl> {
  return KNOWN_GATEWAYS.map((baseUrl) => buildGatewayUrl(cid, { baseUrl }));
}

/** Select the first (primary) gateway URL for a CID. */
export function primaryGatewayUrl(
  cid: CID,
  baseUrl: string = KNOWN_GATEWAYS[0]
): GatewayUrl {
  return buildGatewayUrl(cid, { baseUrl });
}
