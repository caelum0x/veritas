// LinearConnector: creates a Linear issue via the Linear GraphQL API.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { ConnectorMeta } from "@veritas/connectors";
import type { OutboundPayload } from "@veritas/connectors";
import { ConnectorConfigError, ConnectorSendError } from "@veritas/connectors";
import { AbstractConnector, BasePlusConfigSchema, assertOk } from "../base.js";

const LinearConfigSchema = BasePlusConfigSchema.extend({
  /** Linear personal or OAuth API key. */
  apiKey: z.string().min(1),
  /** Linear team ID to assign the issue to. */
  teamId: z.string().min(1),
  /** Optional label IDs to apply to created issues. */
  labelIds: z.array(z.string()).default([]),
  /** Optional assignee user ID. */
  assigneeId: z.string().optional(),
  /** Optional project ID. */
  projectId: z.string().optional(),
});

type LinearConfig = z.infer<typeof LinearConfigSchema>;

const LINEAR_API = "https://api.linear.app/graphql";

const PRIORITY_MAP: Record<string, number> = {
  info: 4,     // No priority
  warning: 2,  // Medium
  error: 1,    // Urgent
};

function buildMutation(
  payload: OutboundPayload,
  config: LinearConfig,
): { query: string; variables: Record<string, unknown> } {
  const priority = PRIORITY_MAP[payload.severity] ?? 4;

  const descriptionParts: string[] = [];
  if (payload.body) descriptionParts.push(payload.body);
  if (payload.sourceUrl) descriptionParts.push(`\n**Source:** ${payload.sourceUrl}`);
  if (payload.fields) {
    descriptionParts.push(
      "\n**Details:**\n" +
        Object.entries(payload.fields)
          .map(([k, v]) => `- **${k}:** ${String(v)}`)
          .join("\n"),
    );
  }
  descriptionParts.push(`\n*Event: ${payload.eventType} · ${payload.occurredAt}*`);

  const inputFields: Record<string, unknown> = {
    title: payload.summary,
    description: descriptionParts.join("\n"),
    teamId: config.teamId,
    priority,
    ...(config.labelIds.length > 0 ? { labelIds: config.labelIds } : {}),
    ...(config.assigneeId ? { assigneeId: config.assigneeId } : {}),
    ...(config.projectId ? { projectId: config.projectId } : {}),
  };

  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }
  `;

  return { query, variables: { input: inputFields } };
}

export class LinearConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: LinearConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = LinearConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid Linear config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "Linear", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const { query, variables } = buildMutation(payload, this.config);

    let response: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        response = await fetch(LINEAR_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.config.apiKey,
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Linear request failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
    }

    const text = await response.text().catch(() => "");

    if (!response.ok) {
      return err(new ConnectorSendError(this.meta.id, `Linear API HTTP ${response.status}: ${text}`));
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return err(new ConnectorSendError(this.meta.id, `Linear API returned non-JSON: ${text}`));
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "errors" in parsed &&
      Array.isArray((parsed as Record<string, unknown>).errors)
    ) {
      const errors = (parsed as { errors: Array<{ message: string }> }).errors;
      const msg = errors.map((e) => e.message).join("; ");
      return err(new ConnectorSendError(this.meta.id, `Linear GraphQL error: ${msg}`));
    }

    return ok(undefined);
  }
}
