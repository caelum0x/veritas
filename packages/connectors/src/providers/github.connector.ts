// GitHub connector: posts fact-verification events as GitHub issue comments or repo dispatches.
import { ok, err, type Result } from "@veritas/core";
import type { Connector, ConnectorMeta } from "../connector.js";
import type { OutboundPayload } from "../payload.js";
import { ConnectorSendError, ConnectorConfigError } from "../errors.js";

export interface GitHubConnectorConfig {
  readonly connectorId: string;
  readonly token: string;
  readonly owner: string;
  readonly repo: string;
  /** "dispatch" sends a repository_dispatch event; "issue-comment" posts on a specific issue. */
  readonly mode: "dispatch" | "issue-comment";
  /** Required when mode === "issue-comment". */
  readonly issueNumber?: number;
  readonly baseApiUrl?: string;
}

interface GitHubDispatchBody {
  readonly event_type: string;
  readonly client_payload: Record<string, unknown>;
}

interface GitHubIssueCommentBody {
  readonly body: string;
}

function buildDispatchBody(payload: OutboundPayload): GitHubDispatchBody {
  return {
    event_type: payload.eventType,
    client_payload: {
      deliveryId: payload.deliveryId,
      summary: payload.summary,
      severity: payload.severity,
      occurredAt: payload.occurredAt,
      ...(payload.body !== undefined ? { body: payload.body } : {}),
      ...(payload.fields !== undefined ? { fields: payload.fields } : {}),
      ...(payload.sourceUrl !== undefined ? { sourceUrl: payload.sourceUrl } : {}),
    },
  };
}

function buildCommentBody(payload: OutboundPayload): GitHubIssueCommentBody {
  const lines: string[] = [
    `**[${payload.severity.toUpperCase()}] ${payload.summary}**`,
    `> _${payload.occurredAt}_`,
  ];
  if (payload.body) lines.push("", payload.body);
  if (payload.fields && Object.keys(payload.fields).length > 0) {
    lines.push("", "| Field | Value |", "| --- | --- |");
    for (const [k, v] of Object.entries(payload.fields)) {
      lines.push(`| ${k} | ${String(v)} |`);
    }
  }
  if (payload.sourceUrl) lines.push("", `[View full context](${payload.sourceUrl})`);
  return { body: lines.join("\n") };
}

export class GitHubConnector implements Connector {
  readonly meta: ConnectorMeta;
  private readonly config: GitHubConnectorConfig;

  constructor(config: GitHubConnectorConfig) {
    if (config.mode === "issue-comment" && config.issueNumber === undefined) {
      throw new ConnectorConfigError(
        config.connectorId,
        "issueNumber is required when mode is issue-comment",
      );
    }
    this.config = config;
    this.meta = { id: config.connectorId, name: "GitHub", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const base = this.config.baseApiUrl ?? "https://api.github.com";
    const { owner, repo, token, mode } = this.config;

    const url =
      mode === "dispatch"
        ? `${base}/repos/${owner}/${repo}/dispatches`
        : `${base}/repos/${owner}/${repo}/issues/${this.config.issueNumber!}/comments`;

    const body =
      mode === "dispatch"
        ? buildDispatchBody(payload)
        : buildCommentBody(payload);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      return err(
        new ConnectorSendError(this.meta.id, "GitHub API request failed", { cause }),
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return err(
        new ConnectorSendError(
          this.meta.id,
          `GitHub API responded with ${response.status}: ${text}`,
        ),
      );
    }

    return ok(undefined);
  }
}
