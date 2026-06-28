// VC Issuer — signs credentials and presentations using a Signer and ProofService.
import type { Result, IsoTimestamp, Clock } from "@veritas/core";
import { ok, err, epochToIso, systemClock } from "@veritas/core";
import { InternalError } from "@veritas/core";
import type { Signer } from "@veritas/crypto";
import type { Did } from "@veritas/did";
import {
  buildCredential,
  attachProof,
  newCredentialId,
} from "./credential.js";
import type {
  VerifiableCredential,
  CredentialSubject,
  CredentialStatus,
  CredentialSchemaRef,
  CredentialEvidence,
  CredentialId,
} from "./credential.js";
import {
  buildPresentation,
  attachPresentationProof,
  newPresentationId,
} from "./presentation.js";
import type { VerifiablePresentation, BuildPresentationOptions } from "./presentation.js";
import type { ProofService } from "./proof.js";
import { defaultProofService } from "./proof.js";

/** Configuration for an Issuer instance. */
export interface IssuerConfig {
  readonly issuerDid: Did;
  readonly verificationMethod: string;
  readonly signer: Signer;
  readonly proofService?: ProofService;
  readonly clock?: Clock;
}

/** Options for issuing a single credential. */
export interface IssueCredentialOptions {
  readonly id?: CredentialId;
  readonly additionalTypes?: readonly string[];
  readonly additionalContexts?: readonly string[];
  readonly credentialSubject: CredentialSubject | readonly CredentialSubject[];
  readonly expiresAt?: IsoTimestamp;
  readonly credentialStatus?: CredentialStatus;
  readonly credentialSchema?: CredentialSchemaRef | readonly CredentialSchemaRef[];
  readonly evidence?: readonly CredentialEvidence[];
  readonly proofPurpose?: string;
}

/** Options for issuing a Verifiable Presentation. */
export interface IssuePresentationOptions extends BuildPresentationOptions {
  readonly challenge: string;
  readonly domain?: string;
}

/** Issues signed Verifiable Credentials and Presentations. */
export class CredentialIssuer {
  private readonly config: Required<Pick<IssuerConfig, "issuerDid" | "verificationMethod" | "signer">> & {
    readonly proofService: ProofService;
    readonly clock: Clock;
  };

  constructor(config: IssuerConfig) {
    this.config = {
      issuerDid: config.issuerDid,
      verificationMethod: config.verificationMethod,
      signer: config.signer,
      proofService: config.proofService ?? defaultProofService,
      clock: config.clock ?? systemClock,
    };
  }

  /** Issue a signed VerifiableCredential. */
  async issue(
    opts: IssueCredentialOptions,
  ): Promise<Result<VerifiableCredential, InternalError>> {
    const issuanceDate = epochToIso(this.config.clock.now());
    const unsigned = buildCredential({
      id: opts.id ?? newCredentialId(),
      additionalTypes: opts.additionalTypes,
      additionalContexts: opts.additionalContexts,
      issuer: this.config.issuerDid,
      issuanceDate,
      expirationDate: opts.expiresAt,
      credentialSubject: opts.credentialSubject,
      credentialStatus: opts.credentialStatus,
      credentialSchema: opts.credentialSchema,
      evidence: opts.evidence,
    });

    const proofResult = await this.config.proofService.createCredentialProof(
      unsigned,
      this.config.signer,
      this.config.verificationMethod,
      opts.proofPurpose,
    );
    if (!proofResult.ok) {
      return err(proofResult.error);
    }
    return ok(attachProof(unsigned, proofResult.value));
  }

  /** Issue a signed VerifiablePresentation. */
  async present(
    opts: IssuePresentationOptions,
  ): Promise<Result<VerifiablePresentation, InternalError>> {
    const unsigned = buildPresentation({
      id: opts.id ?? newPresentationId(),
      holder: opts.holder,
      credentials: opts.credentials,
      additionalContexts: opts.additionalContexts,
      additionalTypes: opts.additionalTypes,
    });

    const proofResult = await this.config.proofService.createPresentationProof(
      unsigned,
      this.config.signer,
      this.config.verificationMethod,
      opts.challenge,
      opts.domain,
    );
    if (!proofResult.ok) {
      return err(proofResult.error);
    }
    return ok(attachPresentationProof(unsigned, proofResult.value));
  }
}
