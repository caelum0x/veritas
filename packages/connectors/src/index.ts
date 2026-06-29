// Public surface of @veritas/connectors: connectors, registry, dispatcher, payload, types, errors.
export type { Connector, ConnectorMeta, ConnectorId } from "./connector.js";
export { ConnectorRegistry } from "./registry.js";
export { Dispatcher } from "./dispatcher.js";
export type { DispatcherOptions, DispatchResult } from "./dispatcher.js";
export { mapEventToPayload } from "./mapping.js";
export type { MappingOptions, SeverityResolver, SummaryResolver, BodyResolver, SourceUrlResolver } from "./mapping.js";
export { OutboundPayloadSchema } from "./payload.js";
export type { OutboundPayload } from "./payload.js";
export { ConnectorError, ConnectorSendError, ConnectorConfigError, ConnectorTimeoutError } from "./errors.js";
export {
  BaseConnectorConfigSchema,
  SlackConnectorConfigSchema,
  DiscordConnectorConfigSchema,
  GitHubConnectorConfigSchema,
  ZapierConnectorConfigSchema,
  WebhookConnectorConfigSchema,
  EmailConnectorConfigSchema,
  TeamsConnectorConfigSchema,
} from "./types.js";
export type {
  BaseConnectorConfig,
  HttpMethod,
  HttpHeaders,
  SlackConnectorConfig,
  DiscordConnectorConfig,
  GitHubConnectorConfig,
  ZapierConnectorConfig,
  WebhookConnectorConfig,
  EmailConnectorConfig,
  TeamsConnectorConfig,
} from "./types.js";
export { SlackConnector } from "./providers/slack.connector.js";
export { DiscordConnector } from "./providers/discord.connector.js";
