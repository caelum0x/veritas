// JiraConnector: creates a Jira issue via the Jira Cloud REST API v3.
import { z } from "zod";
import { ok, err, isOk, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import {
  AbstractConnector,
  BasePlusConfigSchema,
  ConnectorConfigError,
  ConnectorSendError,
  doPost,
} from "../base.js";

const JiraConfigSchema = BasePlusConfigSchema.extend({
  /** Jira Cloud base URL (e.g. https://myorg.atlassian.net). */
  baseUrl: z.string().url(),
  /** Jira user email for Basic Auth. */
  email: z.string().email(),
  /** Jira API token. */
  apiToken: z.string().min(1),
  /** Target project key (e.g. OPS). */
  projectKey: z.string().min(1),
  /** Issue type name (e.g. Bug, Task, Story). */
  issueType: z.string().default("Task"),
  /** Optional label(s) to apply to created issues. */
  labels: z.array(z.string()).default(["veritas"]),
  /** Optional component name. */
  component: z.string().optional(),
});

type JiraConfig = z.infer<typeof JiraConfigSchema>;

const PRIORITY_MAP: Record<string, string> = {
  info: "Low",
  warning: "Medium",
  error: "High",
};

function buildAdfDoc(text: string): Record<string, unknown> {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function buildDescriptionText(payload: OutboundPayload): string {
  const parts: string[] = [];
  if (payload.body) parts.push(payload.body);
  if (payload.fields) {
    parts.push("\nDetails:");
    for (const [k, v] of Object.entries(payload.fields)) {
      parts.push(`  ${k}: ${String(v)}`);
    }
  }
  parts.push(`\nEvent: ${payload.eventType}`);
  parts.push(`Occurred: ${payload.occurredAt}`);
  if (payload.sourceUrl) parts.push(`Source: ${payload.sourceUrl}`);
  return parts.join("\n");
}

function buildIssuePayload(
  payload: OutboundPayload,
  config: JiraConfig,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    summary: payload.summary,
    description: buildAdfDoc(buildDescriptionText(payload)),
    project: { key: config.projectKey },
    issuetype: { name: config.issueType },
    priority: { name: PRIORITY_MAP[payload.severity] ?? "Low" },
    labels: config.labels,
  };

  if (config.component) {
    fields["components"] = [{ name: config.component }];
  }

  return { fields };
}

export class JiraConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: JiraConfig;
  private readonly credentials: string;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = JiraConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid Jira config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "Jira", version: "1.0.0" };
    this.credentials = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString("base64");
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/rest/api/3/issue`;
    const headers = {
      Authorization: `Basic ${this.credentials}`,
      Accept: "application/json",
    };

    const body = buildIssuePayload(payload, this.config);
    const result = await doPost(this.meta.id, url, headers, body, this.config.timeoutMs);
    if (!isOk(result)) return result;

    const { status, body: responseBody } = result.value;
    if (status >= 200 && status < 300) return ok(undefined);

    return err(
      new ConnectorSendError(this.meta.id, `Jira API returned HTTP ${status}: ${responseBody}`),
    );
  }
}
