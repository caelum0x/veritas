// Flow dependency bundle — ports injected into all verification flows.
import type { EventBus, Logger } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import type { EngineOptions } from "@veritas/verification";
import type { AttestationRegistry, AttestationRecordStore, OnchainPort } from "@veritas/attestation";
import type { FetcherPort } from "@veritas/ingestion";
import type { ClassifierLLMPort } from "@veritas/taxonomy";
import type { DataSourcePort, SpecializedVerifier } from "@veritas/verifier-kit";

export interface VerificationFlowDeps {
  readonly llm: VerifierLLM;
  readonly engineOptions?: Partial<EngineOptions>;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}

export interface AttestationFlowDeps extends VerificationFlowDeps {
  readonly attestationRegistry: AttestationRegistry;
  readonly attestationRecordStore: AttestationRecordStore;
  readonly onchainPort: OnchainPort;
}

export interface IngestionFlowDeps extends VerificationFlowDeps {
  readonly fetcher: FetcherPort;
}

export interface DomainRoutedVerifyDeps extends VerificationFlowDeps {
  readonly classifierLlm: ClassifierLLMPort;
  readonly verifiers: ReadonlyArray<SpecializedVerifier>;
  readonly dataSource: DataSourcePort;
}
