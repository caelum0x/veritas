// SAML metadata: parse and generate SP/IdP metadata XML documents

import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import { SsoError } from "../errors.js";

/** Parsed IdP metadata extracted from a SAML metadata XML document. */
export interface SamlIdpMetadata {
  readonly entityId: string;
  readonly ssoUrl: string;
  readonly sloUrl: string | undefined;
  readonly signingCertificates: readonly string[];
  readonly wantAuthnRequestsSigned: boolean;
}

/** Configuration for generating SP metadata. */
export interface SpMetadataConfig {
  readonly entityId: string;
  readonly acsUrl: string;
  readonly sloUrl?: string;
  readonly signingCertificate?: string;
  readonly wantAssertionsSigned?: boolean;
  readonly nameIdFormat?: string;
}

export const SpMetadataConfigSchema = z.object({
  entityId: z.string().url(),
  acsUrl: z.string().url(),
  sloUrl: z.string().url().optional(),
  signingCertificate: z.string().optional(),
  wantAssertionsSigned: z.boolean().optional(),
  nameIdFormat: z.string().optional(),
});

/** Extract text content of a named XML element. */
function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]+)<`, "i");
  return re.exec(xml)?.[1]?.trim() || undefined;
}

/** Extract an XML attribute value by name. */
function extractAttr(xml: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}="([^"]+)"`, "i");
  return re.exec(xml)?.[1];
}

/** Extract all PEM-like certificate strings from KeyDescriptor elements. */
function extractCertificates(xml: string): readonly string[] {
  const certs: string[] = [];
  const re = /<(?:[^:>]+:)?X509Certificate[^>]*>([^<]+)<\/(?:[^:>]+:)?X509Certificate>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const cert = m[1]?.replace(/\s+/g, "").trim();
    if (cert) certs.push(cert);
  }
  return certs;
}

/** Parse a SAML IdP metadata XML string into a typed structure. */
export function parseSamlIdpMetadata(
  xml: string,
): Result<SamlIdpMetadata, SsoError> {
  const entityId = extractAttr(xml, "entityID");
  if (!entityId) {
    return err(new SsoError("Missing entityID in IdP metadata"));
  }

  const ssoUrl = (() => {
    const bindingRe =
      /<(?:[^:>]+:)?SingleSignOnService[^>]+Binding="[^"]*HTTP-POST[^"]*"[^>]+Location="([^"]+)"/i;
    const redirectRe =
      /<(?:[^:>]+:)?SingleSignOnService[^>]+Binding="[^"]*HTTP-Redirect[^"]*"[^>]+Location="([^"]+)"/i;
    return (
      bindingRe.exec(xml)?.[1] ??
      redirectRe.exec(xml)?.[1] ??
      extractAttr(xml, "Location")
    );
  })();

  if (!ssoUrl) {
    return err(new SsoError("Missing SingleSignOnService Location in IdP metadata"));
  }

  const sloUrlMatch =
    /<(?:[^:>]+:)?SingleLogoutService[^>]+Location="([^"]+)"/i.exec(xml);
  const sloUrl = sloUrlMatch?.[1];

  const signingCertificates = extractCertificates(xml);

  const wantMatch = /WantAuthnRequestsSigned="([^"]+)"/i.exec(xml);
  const wantAuthnRequestsSigned =
    wantMatch?.[1]?.toLowerCase() === "true";

  return ok({
    entityId,
    ssoUrl,
    sloUrl,
    signingCertificates,
    wantAuthnRequestsSigned,
  });
}

const DEFAULT_NAME_ID_FORMAT =
  "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";

/** Generate SP (Service Provider) metadata XML. */
export function generateSpMetadata(config: SpMetadataConfig): string {
  const nameIdFormat = config.nameIdFormat ?? DEFAULT_NAME_ID_FORMAT;
  const wantSigned = config.wantAssertionsSigned ?? true;

  const certElement = config.signingCertificate
    ? `
  <md:KeyDescriptor use="signing">
    <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:X509Data>
        <ds:X509Certificate>${config.signingCertificate}</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </md:KeyDescriptor>`
    : "";

  const sloElement = config.sloUrl
    ? `
  <md:SingleLogoutService
    Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
    Location="${config.sloUrl}" />`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${config.entityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="${String(wantSigned)}"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${certElement}${sloElement}
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${config.acsUrl}"
      index="0"
      isDefault="true" />
    <md:NameIDFormat>${nameIdFormat}</md:NameIDFormat>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}
