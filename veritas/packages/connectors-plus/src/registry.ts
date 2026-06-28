// registerAllPlusConnectors: bulk-registers all connectors-plus providers into a ConnectorRegistry.
import { type Result, ok } from "@veritas/core";
import { ConnectorRegistry } from "@veritas/connectors";
import { AbstractConnector } from "./base.js";
import { NotionConnector } from "./providers/notion.connector.js";
import { LinearConnector } from "./providers/linear.connector.js";
import { TelegramConnector } from "./providers/telegram.connector.js";
import { TwilioSmsConnector } from "./providers/twilio-sms.connector.js";
import { PagerDutyConnector } from "./providers/pagerduty.connector.js";
import { JiraConnector } from "./providers/jira.connector.js";
import { AsanaConnector } from "./providers/asana.connector.js";
import { SendgridConnector } from "./providers/sendgrid.connector.js";
import { MattermostConnector } from "./providers/mattermost.connector.js";

export type PlusProviderTag =
  | "notion"
  | "linear"
  | "telegram"
  | "twilio-sms"
  | "pagerduty"
  | "jira"
  | "asana"
  | "sendgrid"
  | "mattermost";

export interface PlusConnectorSpec {
  readonly tag: PlusProviderTag;
  readonly id: string;
  readonly config: unknown;
}

/** Factory map from tag → constructor. */
const FACTORIES: Record<PlusProviderTag, new (id: string, config: unknown) => AbstractConnector> = {
  notion: NotionConnector,
  linear: LinearConnector,
  telegram: TelegramConnector,
  "twilio-sms": TwilioSmsConnector,
  pagerduty: PagerDutyConnector,
  jira: JiraConnector,
  asana: AsanaConnector,
  sendgrid: SendgridConnector,
  mattermost: MattermostConnector,
};

/**
 * Instantiate and register a set of connectors-plus providers.
 * Returns the first registration error encountered, or ok(void) on success.
 */
export function registerPlusConnectors(
  registry: ConnectorRegistry,
  specs: readonly PlusConnectorSpec[],
): Result<void> {
  for (const spec of specs) {
    const Ctor = FACTORIES[spec.tag];
    const connector = new Ctor(spec.id, spec.config);
    const result = registry.register(connector);
    if (result.ok === false) {
      return result;
    }
  }
  return ok(undefined);
}
