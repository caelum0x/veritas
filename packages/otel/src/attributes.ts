// Semantic attribute name constants aligned with the OpenTelemetry semantic conventions.

/** HTTP semantic attributes (semconv 1.24). */
export const HttpAttributes = {
  METHOD: "http.request.method",
  URL: "url.full",
  SCHEME: "url.scheme",
  TARGET: "http.target",
  HOST: "server.address",
  STATUS_CODE: "http.response.status_code",
  FLAVOR: "network.protocol.version",
  USER_AGENT: "user_agent.original",
  REQUEST_CONTENT_LENGTH: "http.request.body.size",
  RESPONSE_CONTENT_LENGTH: "http.response.body.size",
  ROUTE: "http.route",
} as const;

/** Database semantic attributes. */
export const DbAttributes = {
  SYSTEM: "db.system",
  NAME: "db.name",
  STATEMENT: "db.statement",
  OPERATION: "db.operation",
  USER: "db.user",
  HOST: "server.address",
  PORT: "server.port",
  CONNECTION_STRING: "db.connection_string",
} as const;

/** Messaging (queue/topic) semantic attributes. */
export const MessagingAttributes = {
  SYSTEM: "messaging.system",
  DESTINATION: "messaging.destination.name",
  DESTINATION_KIND: "messaging.destination.kind",
  OPERATION: "messaging.operation",
  MESSAGE_ID: "messaging.message.id",
  PAYLOAD_SIZE: "messaging.message.body.size",
} as const;

/** RPC semantic attributes. */
export const RpcAttributes = {
  SYSTEM: "rpc.system",
  SERVICE: "rpc.service",
  METHOD: "rpc.method",
  GRPC_STATUS_CODE: "rpc.grpc.status_code",
} as const;

/** Exception event attributes. */
export const ExceptionAttributes = {
  TYPE: "exception.type",
  MESSAGE: "exception.message",
  STACKTRACE: "exception.stacktrace",
  ESCAPED: "exception.escaped",
} as const;

/** General network / server attributes. */
export const NetworkAttributes = {
  PEER_ADDRESS: "network.peer.address",
  PEER_PORT: "network.peer.port",
  TRANSPORT: "network.transport",
} as const;

/** Veritas domain-specific span attributes. */
export const VeritasAttributes = {
  CLAIM_ID: "veritas.claim.id",
  VERIFICATION_ID: "veritas.verification.id",
  SOURCE_ID: "veritas.source.id",
  ORDER_ID: "veritas.order.id",
  JOB_ID: "veritas.job.id",
  USER_ID: "veritas.user.id",
  ORG_ID: "veritas.org.id",
  VERDICT: "veritas.verdict",
  CONFIDENCE: "veritas.confidence",
  OPERATION: "veritas.operation",
} as const;

/** Resource attribute name constants. */
export const ResourceAttributes = {
  SERVICE_NAME: "service.name",
  SERVICE_VERSION: "service.version",
  SERVICE_INSTANCE_ID: "service.instance.id",
  SERVICE_NAMESPACE: "service.namespace",
  DEPLOYMENT_ENVIRONMENT: "deployment.environment",
  HOST_NAME: "host.name",
  OS_TYPE: "os.type",
  PROCESS_PID: "process.pid",
  TELEMETRY_SDK_NAME: "telemetry.sdk.name",
  TELEMETRY_SDK_LANGUAGE: "telemetry.sdk.language",
  TELEMETRY_SDK_VERSION: "telemetry.sdk.version",
} as const;
