// AsanaConnector: creates an Asana task via the Asana REST API v1.
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

const AsanaConfigSchema = BasePlusConfigSchema.extend({
  /** Asana personal access token. */
  accessToken: z.string().min(1),
  /** GID of the Asana project to add tasks to. */
  projectGid: z.string().min(1),
  /** GID of the Asana workspace. */
  workspaceGid: z.string().min(1),
  /** Optional GID of user to assign tasks to. */
  assigneeGid: z.string().optional(),
  /** Optional section GID within the project. */
  sectionGid: z.string().optional(),
});

type AsanaConfig = z.infer<typeof AsanaConfigSchema>;

const ASANA_API = "https://app.asana.com/api/1.0/tasks";

function buildNotes(payload: OutboundPayload): string {
  const parts: string[] = [`Severity: ${payload.severity.toUpperCase()}`];
  parts.push(`Event: ${payload.eventType}`);
  parts.push(`Occurred: ${payload.occurredAt}`);
  if (payload.body) parts.push(`\n${payload.body}`);
  if (payload.fields) {
    parts.push("\nDetails:");
    for (const [k, v] of Object.entries(payload.fields)) {
      parts.push(`  ${k}: ${String(v)}`);
    }
  }
  if (payload.sourceUrl) parts.push(`\nSource: ${payload.sourceUrl}`);
  return parts.join("\n");
}

function buildTaskPayload(payload: OutboundPayload, config: AsanaConfig): Record<string, unknown> {
  const data: Record<string, unknown> = {
    name: payload.summary,
    notes: buildNotes(payload),
    projects: [config.projectGid],
    workspace: config.workspaceGid,
  };

  if (config.assigneeGid) data["assignee"] = config.assigneeGid;

  return { data };
}

export class AsanaConnector extends AbstractConnector {
  readonly meta: ConnectorMeta;
  private readonly config: AsanaConfig;

  constructor(id: string, rawConfig: unknown) {
    super();
    const parsed = AsanaConfigSchema.safeParse(rawConfig);
    if (!parsed.success) {
      throw new ConnectorConfigError(id, `Invalid Asana config: ${parsed.error.message}`);
    }
    this.config = parsed.data;
    this.meta = { id, name: "Asana", version: "1.0.0" };
  }

  async send(payload: OutboundPayload): Promise<Result<void>> {
    const headers = {
      Authorization: `Bearer ${this.config.accessToken}`,
      Accept: "application/json",
    };

    const body = buildTaskPayload(payload, this.config);
    const result = await doPost(this.meta.id, ASANA_API, headers, body, this.config.timeoutMs);
    if (!isOk(result)) return result;

    const { status, body: responseBody } = result.value;
    if (status < 200 || status >= 300) {
      return err(
        new ConnectorSendError(this.meta.id, `Asana API returned HTTP ${status}: ${responseBody}`),
      );
    }

    if (!this.config.sectionGid) return ok(undefined);

    // Move task to section if configured; parse task GID from response.
    let taskGid: string;
    try {
      const parsed = JSON.parse(responseBody) as { data?: { gid?: string } };
      taskGid = parsed.data?.gid ?? "";
    } catch {
      return ok(undefined);
    }

    if (!taskGid) return ok(undefined);

    const sectionUrl = `https://app.asana.com/api/1.0/sections/${this.config.sectionGid}/addTask`;
    const sectionResult = await doPost(
      this.meta.id,
      sectionUrl,
      headers,
      { data: { task: taskGid } },
      this.config.timeoutMs,
    );
    if (!isOk(sectionResult)) return sectionResult;

    const { status: sStatus, body: sBody } = sectionResult.value;
    if (sStatus < 200 || sStatus >= 300) {
      return err(
        new ConnectorSendError(
          this.meta.id,
          `Asana addTask to section returned HTTP ${sStatus}: ${sBody}`,
        ),
      );
    }

    return ok(undefined);
  }
}
