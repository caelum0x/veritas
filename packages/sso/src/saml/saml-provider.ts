// SAML provider: IdpProvider implementation for SAML 2.0 HTTP-POST binding

import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { SsoError, AssertionValidationError } from "../errors.js";
import type { IdpProvider, LoginOptions, LoginRedirect, CallbackParams } from "../provider.js";
import type { BaseProviderConfig, SsoPrincipal, CallbackResult } from "../types.js";
import { parseSamlAssertion } from "./assertion.js";
import { parseSamlIdpMetadata, type SamlIdpMetadata } from "./metadata.js";
import { mapAttributes, type AttributeMap, DEFAULT_ATTRIBUTE_MAP } from "../attribute-mapping.js";

/** SAML-specific provider configuration. */
export interface SamlProviderConfig extends BaseProviderConfig {
  readonly protocol: "saml";
  /** SP entityID — must match SP metadata. */
  readonly spEntityId: string;
  /** ACS (Assertion Consumer Service) URL for HTTP-POST binding. */
  readonly acsUrl: string;
  /** Raw IdP metadata XML or a URL to fetch it from. */
  readonly idpMetadataXml: string;
  /** Per-provider attribute map. */
  readonly attributeMap?: Partial<AttributeMap>;
}

export const SamlProviderConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  protocol: z.literal("saml"),
  orgId: z.string().min(1),
  enabled: z.boolean(),
  spEntityId: z.string().min(1),
  acsUrl: z.string().url(),
  idpMetadataXml: z.string().min(1),
  attributeMap: z
    .object({
      externalId: z.string().optional(),
      email: z.string().optional(),
      displayName: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      groups: z.string().optional(),
    })
    .optional(),
});

/** Build a minimal SAML AuthnRequest XML. */
function buildAuthnRequest(
  requestId: string,
  issueInstant: string,
  spEntityId: string,
  acsUrl: string,
  destination: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${destination}"
  AssertionConsumerServiceURL="${acsUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${spEntityId}</saml:Issuer>
</samlp:AuthnRequest>`;
}

/** SAML 2.0 IdP provider implementation (HTTP-POST binding, no signature validation in mock). */
export class SamlProvider implements IdpProvider {
  readonly config: BaseProviderConfig;
  private readonly samlConfig: SamlProviderConfig;
  private readonly idpMeta: SamlIdpMetadata;
  private readonly effectiveMap: AttributeMap;

  private constructor(
    samlConfig: SamlProviderConfig,
    idpMeta: SamlIdpMetadata,
  ) {
    this.samlConfig = samlConfig;
    this.idpMeta = idpMeta;
    this.config = {
      id: samlConfig.id,
      displayName: samlConfig.displayName,
      protocol: "saml",
      orgId: samlConfig.orgId,
      enabled: samlConfig.enabled,
    };
    this.effectiveMap = samlConfig.attributeMap
      ? { ...DEFAULT_ATTRIBUTE_MAP, ...samlConfig.attributeMap }
      : DEFAULT_ATTRIBUTE_MAP;
  }

  /** Factory: parse IdP metadata XML before constructing. */
  static create(
    rawConfig: SamlProviderConfig,
  ): Result<SamlProvider, SsoError> {
    const metaResult = parseSamlIdpMetadata(rawConfig.idpMetadataXml);
    if (!metaResult.ok) return metaResult;
    return ok(new SamlProvider(rawConfig, metaResult.value));
  }

  async initiateLogin(
    options: LoginOptions,
  ): Promise<Result<LoginRedirect, SsoError>> {
    const requestId = `_${newId("saml")}`;
    const issueInstant = new Date().toISOString();

    const authnXml = buildAuthnRequest(
      requestId,
      issueInstant,
      this.samlConfig.spEntityId,
      this.samlConfig.acsUrl,
      this.idpMeta.ssoUrl,
    );

    const encoded = Buffer.from(authnXml).toString("base64");
    const relayState = options.relayState ?? "";

    const url = new URL(this.idpMeta.ssoUrl);
    url.searchParams.set("SAMLRequest", encoded);
    if (relayState) url.searchParams.set("RelayState", relayState);

    // State carries requestId so the callback can verify InResponseTo
    const state = Buffer.from(JSON.stringify({ requestId, relayState })).toString("base64");

    return ok({ redirectUrl: url.toString(), state });
  }

  async handleCallback(
    params: CallbackParams,
    storedState: string,
  ): Promise<Result<CallbackResult, SsoError>> {
    const samlResponse = params["SAMLResponse"];
    if (!samlResponse) {
      return err(new SsoError("Missing SAMLResponse parameter"));
    }

    let storedRequestId: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(storedState, "base64").toString("utf-8")) as unknown;
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "requestId" in decoded &&
        typeof (decoded as Record<string, unknown>)["requestId"] === "string"
      ) {
        storedRequestId = (decoded as Record<string, string>)["requestId"];
      }
    } catch {
      return err(new SsoError("Invalid stored SSO state"));
    }

    const parseResult = parseSamlAssertion(samlResponse, Date.now());
    if (!parseResult.ok) {
      return err(parseResult.error);
    }

    const assertion = parseResult.value;

    if (
      storedRequestId &&
      assertion.inResponseTo &&
      assertion.inResponseTo !== storedRequestId
    ) {
      return err(new AssertionValidationError("InResponseTo mismatch in SAML assertion"));
    }

    // Build attributes including NameID under "sub" and "email" if present
    const mergedAttrs: Record<string, string | string[]> = {
      ...assertion.attributes,
      sub: assertion.subjectNameId,
    };

    if (!mergedAttrs["email"] && assertion.subjectNameId.includes("@")) {
      mergedAttrs["email"] = assertion.subjectNameId;
    }

    const mapResult = mapAttributes(mergedAttrs, this.effectiveMap);
    if (!mapResult.ok) {
      return err(new SsoError(`Attribute mapping failed: ${mapResult.error.message}`));
    }

    return ok({
      principal: mapResult.value,
      providerId: this.config.id,
      sessionIndex: assertion.sessionIndex,
    });
  }

  async resolvePrincipal(
    result: CallbackResult,
  ): Promise<Result<SsoPrincipal, SsoError>> {
    return ok(result.principal);
  }

  async healthCheck(): Promise<Result<void, SsoError>> {
    if (!this.idpMeta.ssoUrl) {
      return err(new SsoError("IdP SSO URL is not configured"));
    }
    return ok(undefined);
  }
}
