// Typed errors for the flows-verification package.

export class FlowVerificationError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "FlowVerificationError";
    this.code = code;
  }
}

export class FlowIngestionError extends FlowVerificationError {
  constructor(message: string) {
    super(message, "FLOW_INGESTION_ERROR");
    this.name = "FlowIngestionError";
  }
}

export class FlowAttestationError extends FlowVerificationError {
  constructor(message: string) {
    super(message, "FLOW_ATTESTATION_ERROR");
    this.name = "FlowAttestationError";
  }
}

export class FlowQualityGateError extends FlowVerificationError {
  constructor(message: string) {
    super(message, "FLOW_QUALITY_GATE_ERROR");
    this.name = "FlowQualityGateError";
  }
}

export class FlowClassificationError extends FlowVerificationError {
  constructor(message: string) {
    super(message, "FLOW_CLASSIFICATION_ERROR");
    this.name = "FlowClassificationError";
  }
}

export class FlowRoutingError extends FlowVerificationError {
  constructor(message: string) {
    super(message, "FLOW_ROUTING_ERROR");
    this.name = "FlowRoutingError";
  }
}

export class FlowNoVerifierError extends FlowVerificationError {
  readonly domain: string;
  constructor(domain: string) {
    super(`No verifier available for domain: ${domain}`, "FLOW_NO_VERIFIER_ERROR");
    this.name = "FlowNoVerifierError";
    this.domain = domain;
  }
}
