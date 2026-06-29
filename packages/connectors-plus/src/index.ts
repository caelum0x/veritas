// Public surface of @veritas/connectors-plus: additional connector providers and bulk registration.
export { AbstractConnector, BasePlusConfigSchema, doPost, assertOk } from "./base.js";
export type { BasePlusConfig, FetchResult } from "./base.js";
export { registerPlusConnectors } from "./registry.js";
export type { PlusProviderTag, PlusConnectorSpec } from "./registry.js";
export { NotionConnector } from "./providers/notion.connector.js";
export { LinearConnector } from "./providers/linear.connector.js";
export { TelegramConnector } from "./providers/telegram.connector.js";
export { TwilioSmsConnector } from "./providers/twilio-sms.connector.js";
export { PagerDutyConnector } from "./providers/pagerduty.connector.js";
export { JiraConnector } from "./providers/jira.connector.js";
export { AsanaConnector } from "./providers/asana.connector.js";
export { SendgridConnector } from "./providers/sendgrid.connector.js";
export { MattermostConnector } from "./providers/mattermost.connector.js";
