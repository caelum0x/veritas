// WebAuthn port interface and mock implementation for passkey/FIDO2 MFA factor.
import { randomBytes } from "node:crypto";

/** Registration options sent to the authenticator. */
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  timeout: number;
}

/** Credential returned after successful registration. */
export interface WebAuthnCredential {
  credentialId: string;
  publicKey: string;
  signCount: number;
  aaguid: string;
  transports: string[];
  createdAt: string;
}

/** Authentication options sent to the authenticator. */
export interface WebAuthnAuthenticationOptions {
  challenge: string;
  rpId: string;
  allowCredentialIds: string[];
  timeout: number;
}

/** Assertion returned after successful authentication. */
export interface WebAuthnAssertion {
  credentialId: string;
  authenticatorData: string;
  signature: string;
  clientDataJSON: string;
  userHandle?: string;
}

/** Result of verifying a WebAuthn assertion. */
export interface WebAuthnVerifyResult {
  verified: boolean;
  newSignCount?: number;
}

/** Port interface for WebAuthn operations (backed by real FIDO2 or mock). */
export interface WebAuthnPort {
  /** Generate registration options for a new credential. */
  generateRegistrationOptions(
    userId: string,
    userName: string,
    displayName: string
  ): Promise<WebAuthnRegistrationOptions>;

  /** Verify and store a newly registered credential. */
  verifyRegistration(
    options: WebAuthnRegistrationOptions,
    attestationResponse: Record<string, unknown>
  ): Promise<WebAuthnCredential>;

  /** Generate authentication options for an existing credential. */
  generateAuthenticationOptions(
    credentialIds: string[]
  ): Promise<WebAuthnAuthenticationOptions>;

  /** Verify an authentication assertion against a stored credential. */
  verifyAuthentication(
    options: WebAuthnAuthenticationOptions,
    assertion: WebAuthnAssertion,
    storedCredential: WebAuthnCredential
  ): Promise<WebAuthnVerifyResult>;
}

/** Mock implementation for testing and development. */
export class MockWebAuthnPort implements WebAuthnPort {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly timeout: number;

  constructor(
    rpId = "localhost",
    rpName = "Veritas",
    timeout = 60_000
  ) {
    this.rpId = rpId;
    this.rpName = rpName;
    this.timeout = timeout;
  }

  async generateRegistrationOptions(
    userId: string,
    userName: string,
    displayName: string
  ): Promise<WebAuthnRegistrationOptions> {
    return {
      challenge: randomBytes(32).toString("base64url"),
      rpId: this.rpId,
      rpName: this.rpName,
      userId,
      userName,
      userDisplayName: displayName,
      timeout: this.timeout,
    };
  }

  async verifyRegistration(
    options: WebAuthnRegistrationOptions,
    _attestationResponse: Record<string, unknown>
  ): Promise<WebAuthnCredential> {
    // Mock: always succeed and fabricate a credential
    return {
      credentialId: randomBytes(16).toString("base64url"),
      publicKey: randomBytes(64).toString("base64url"),
      signCount: 0,
      aaguid: "00000000-0000-0000-0000-000000000000",
      transports: ["internal"],
      createdAt: new Date().toISOString(),
    };
  }

  async generateAuthenticationOptions(
    credentialIds: string[]
  ): Promise<WebAuthnAuthenticationOptions> {
    return {
      challenge: randomBytes(32).toString("base64url"),
      rpId: this.rpId,
      allowCredentialIds: credentialIds,
      timeout: this.timeout,
    };
  }

  async verifyAuthentication(
    _options: WebAuthnAuthenticationOptions,
    assertion: WebAuthnAssertion,
    storedCredential: WebAuthnCredential
  ): Promise<WebAuthnVerifyResult> {
    // Mock: verify that the credential IDs match
    const verified = assertion.credentialId === storedCredential.credentialId;
    return {
      verified,
      newSignCount: verified ? storedCredential.signCount + 1 : undefined,
    };
  }
}
