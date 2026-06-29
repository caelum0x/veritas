// SAML assertion parse: extracts attributes from a base64-encoded SAML Response XML

import { ok, err, type Result } from "@veritas/core";
import { AssertionValidationError } from "../errors.js";
import type { IdpAttributes } from "../types.js";

/** Parsed content of a SAML assertion after basic validation. */
export interface ParsedSamlAssertion {
  readonly issuer: string;
  readonly subjectNameId: string;
  readonly sessionIndex: string | undefined;
  readonly notBefore: string | undefined;
  readonly notOnOrAfter: string | undefined;
  readonly attributes: IdpAttributes;
  readonly inResponseTo: string | undefined;
}

/** Extract all text nodes from a naive XML tag. */
function extractText(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, "i");
  const m = re.exec(xml);
  return m?.[1]?.trim() || undefined;
}

/** Extract attribute value(s) from a SAML AttributeStatement. */
function extractAttributes(xml: string): IdpAttributes {
  const attrs: Record<string, string | string[]> = {};
  const attrRe =
    /<(?:[^:>]+:)?Attribute[^>]+Name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?Attribute>/gi;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attrRe.exec(xml)) !== null) {
    const name = attrMatch[1];
    const body = attrMatch[2] ?? "";
    if (!name) continue;

    const valRe = /<(?:[^:>]+:)?AttributeValue[^>]*>([^<]*)<\/(?:[^:>]+:)?AttributeValue>/gi;
    const values: string[] = [];
    let valMatch: RegExpExecArray | null;

    while ((valMatch = valRe.exec(body)) !== null) {
      const v = valMatch[1]?.trim();
      if (v) values.push(v);
    }

    if (values.length === 1) {
      attrs[name] = values[0] as string;
    } else if (values.length > 1) {
      attrs[name] = values;
    }
  }

  return attrs;
}

/** Decode a base64-encoded SAML Response and parse its core assertion fields. */
export function parseSamlAssertion(
  base64Response: string,
  nowMs: number = Date.now(),
): Result<ParsedSamlAssertion, AssertionValidationError> {
  let xml: string;
  try {
    xml = Buffer.from(base64Response, "base64").toString("utf-8");
  } catch {
    return err(new AssertionValidationError("Could not decode base64 SAML response"));
  }

  const issuer = extractText(xml, "Issuer");
  if (!issuer) {
    return err(new AssertionValidationError("Missing <Issuer> in SAML assertion"));
  }

  const subjectNameId = extractText(xml, "NameID");
  if (!subjectNameId) {
    return err(new AssertionValidationError("Missing <NameID> in SAML subject"));
  }

  const notOnOrAfter = (() => {
    const m = /NotOnOrAfter="([^"]+)"/i.exec(xml);
    return m?.[1];
  })();

  if (notOnOrAfter) {
    const exp = new Date(notOnOrAfter).getTime();
    if (!Number.isNaN(exp) && nowMs > exp) {
      return err(new AssertionValidationError(`SAML assertion expired at ${notOnOrAfter}`));
    }
  }

  const notBefore = (() => {
    const m = /NotBefore="([^"]+)"/i.exec(xml);
    return m?.[1];
  })();

  if (notBefore) {
    const nbf = new Date(notBefore).getTime();
    if (!Number.isNaN(nbf) && nowMs < nbf - 30_000 /* 30 s clock skew */) {
      return err(new AssertionValidationError(`SAML assertion not yet valid (NotBefore: ${notBefore})`));
    }
  }

  const sessionIndexMatch = /SessionIndex="([^"]+)"/i.exec(xml);
  const sessionIndex = sessionIndexMatch?.[1];

  const inResponseToMatch = /InResponseTo="([^"]+)"/i.exec(xml);
  const inResponseTo = inResponseToMatch?.[1];

  return ok({
    issuer,
    subjectNameId,
    sessionIndex,
    notBefore,
    notOnOrAfter,
    attributes: extractAttributes(xml),
    inResponseTo,
  });
}
