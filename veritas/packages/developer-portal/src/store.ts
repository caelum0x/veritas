// Developer portal in-memory store — port interface for portal data persistence
import { type Result, ok, err, NotFoundError, ConflictError } from "@veritas/core";
import { type DeveloperApp } from "./app.js";
import { type TeamMember } from "./team.js";
import { type AppEnvironment } from "./environment.js";
import { type WebhookConfig } from "./webhook-config.js";

export interface PortalStore {
  // Apps
  getApp(id: string): Promise<Result<DeveloperApp>>;
  listApps(organizationId: string): Promise<Result<DeveloperApp[]>>;
  saveApp(app: DeveloperApp): Promise<Result<DeveloperApp>>;

  // Team members
  getMember(id: string): Promise<Result<TeamMember>>;
  getMemberByEmail(appId: string, email: string): Promise<Result<TeamMember>>;
  listMembers(appId: string): Promise<Result<TeamMember[]>>;
  saveMember(member: TeamMember): Promise<Result<TeamMember>>;

  // Environments
  getEnvironment(id: string): Promise<Result<AppEnvironment>>;
  listEnvironments(appId: string): Promise<Result<AppEnvironment[]>>;
  saveEnvironment(env: AppEnvironment): Promise<Result<AppEnvironment>>;

  // Webhooks
  getWebhookConfig(id: string): Promise<Result<WebhookConfig>>;
  listWebhookConfigs(appId: string): Promise<Result<WebhookConfig[]>>;
  saveWebhookConfig(config: WebhookConfig): Promise<Result<WebhookConfig>>;
}

export class InMemoryPortalStore implements PortalStore {
  private readonly apps = new Map<string, DeveloperApp>();
  private readonly members = new Map<string, TeamMember>();
  private readonly environments = new Map<string, AppEnvironment>();
  private readonly webhooks = new Map<string, WebhookConfig>();

  async getApp(id: string): Promise<Result<DeveloperApp>> {
    const app = this.apps.get(id);
    return app ? ok(app) : err(new NotFoundError({ message: `App ${id} not found` }));
  }

  async listApps(organizationId: string): Promise<Result<DeveloperApp[]>> {
    const results = [...this.apps.values()].filter((a) => a.organizationId === organizationId);
    return ok(results);
  }

  async saveApp(app: DeveloperApp): Promise<Result<DeveloperApp>> {
    this.apps.set(app.id, app);
    return ok(app);
  }

  async getMember(id: string): Promise<Result<TeamMember>> {
    const member = this.members.get(id);
    return member ? ok(member) : err(new NotFoundError({ message: `Member ${id} not found` }));
  }

  async getMemberByEmail(appId: string, email: string): Promise<Result<TeamMember>> {
    const member = [...this.members.values()].find((m) => m.appId === appId && m.email === email);
    return member ? ok(member) : err(new NotFoundError({ message: `Member ${email} not found in app ${appId}` }));
  }

  async listMembers(appId: string): Promise<Result<TeamMember[]>> {
    const results = [...this.members.values()].filter((m) => m.appId === appId && m.status !== "removed");
    return ok(results);
  }

  async saveMember(member: TeamMember): Promise<Result<TeamMember>> {
    this.members.set(member.id, member);
    return ok(member);
  }

  async getEnvironment(id: string): Promise<Result<AppEnvironment>> {
    const env = this.environments.get(id);
    return env ? ok(env) : err(new NotFoundError({ message: `Environment ${id} not found` }));
  }

  async listEnvironments(appId: string): Promise<Result<AppEnvironment[]>> {
    const results = [...this.environments.values()].filter((e) => e.appId === appId && e.status === "active");
    return ok(results);
  }

  async saveEnvironment(env: AppEnvironment): Promise<Result<AppEnvironment>> {
    this.environments.set(env.id, env);
    return ok(env);
  }

  async getWebhookConfig(id: string): Promise<Result<WebhookConfig>> {
    const config = this.webhooks.get(id);
    return config ? ok(config) : err(new NotFoundError({ message: `WebhookConfig ${id} not found` }));
  }

  async listWebhookConfigs(appId: string): Promise<Result<WebhookConfig[]>> {
    const results = [...this.webhooks.values()].filter((w) => w.appId === appId);
    return ok(results);
  }

  async saveWebhookConfig(config: WebhookConfig): Promise<Result<WebhookConfig>> {
    this.webhooks.set(config.id, config);
    return ok(config);
  }
}
