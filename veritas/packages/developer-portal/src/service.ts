// Developer portal service — orchestrates app, team, environment, and webhook operations
import { type Result, ok, err, isErr, NotFoundError, ConflictError, ForbiddenError, ValidationError, type IsoTimestamp } from "@veritas/core";
import { type Clock } from "@veritas/core";
import { type DeveloperApp, type CreateDeveloperApp, type UpdateDeveloperApp, createDeveloperApp, updateApp, suspendApp, activateApp, deleteApp } from "./app.js";
import { type TeamMember, type InviteTeamMember, type UpdateTeamMember, inviteTeamMember, acceptInvite, updateTeamMember, removeTeamMember, canManageMembers } from "./team.js";
import { type AppEnvironment, type CreateAppEnvironment, type UpdateAppEnvironment, createAppEnvironment, updateAppEnvironment, archiveEnvironment, setVariable, removeVariable, maskSecrets, type EnvironmentVariable } from "./environment.js";
import { type WebhookConfig, type CreateWebhookConfig, type UpdateWebhookConfig, createWebhookConfig, updateWebhookConfig, disableWebhook, enableWebhook, recordDeliverySuccess, recordDeliveryFailure } from "./webhook-config.js";
import { type PortalStore } from "./store.js";

export interface PortalService {
  // Apps
  createApp(input: CreateDeveloperApp): Promise<Result<DeveloperApp>>;
  getApp(id: string): Promise<Result<DeveloperApp>>;
  listApps(organizationId: string): Promise<Result<DeveloperApp[]>>;
  updateApp(id: string, patch: UpdateDeveloperApp): Promise<Result<DeveloperApp>>;
  suspendApp(id: string): Promise<Result<DeveloperApp>>;
  activateApp(id: string): Promise<Result<DeveloperApp>>;
  deleteApp(id: string): Promise<Result<DeveloperApp>>;

  // Team
  inviteMember(input: InviteTeamMember, requestorRole: string): Promise<Result<TeamMember>>;
  acceptInvite(memberId: string, userId: string): Promise<Result<TeamMember>>;
  updateMember(id: string, patch: UpdateTeamMember, requestorRole: string): Promise<Result<TeamMember>>;
  removeMember(id: string, requestorRole: string): Promise<Result<TeamMember>>;
  listMembers(appId: string): Promise<Result<TeamMember[]>>;

  // Environments
  createEnvironment(input: CreateAppEnvironment): Promise<Result<AppEnvironment>>;
  getEnvironment(id: string): Promise<Result<AppEnvironment>>;
  listEnvironments(appId: string): Promise<Result<AppEnvironment[]>>;
  updateEnvironment(id: string, patch: UpdateAppEnvironment): Promise<Result<AppEnvironment>>;
  archiveEnvironment(id: string): Promise<Result<AppEnvironment>>;
  setVariable(envId: string, variable: EnvironmentVariable): Promise<Result<AppEnvironment>>;
  removeVariable(envId: string, key: string): Promise<Result<AppEnvironment>>;

  // Webhooks
  createWebhookConfig(input: CreateWebhookConfig): Promise<Result<WebhookConfig>>;
  getWebhookConfig(id: string): Promise<Result<WebhookConfig>>;
  listWebhookConfigs(appId: string): Promise<Result<WebhookConfig[]>>;
  updateWebhookConfig(id: string, patch: UpdateWebhookConfig): Promise<Result<WebhookConfig>>;
  disableWebhook(id: string): Promise<Result<WebhookConfig>>;
  enableWebhook(id: string): Promise<Result<WebhookConfig>>;
  recordDeliverySuccess(id: string): Promise<Result<WebhookConfig>>;
  recordDeliveryFailure(id: string): Promise<Result<WebhookConfig>>;
}

export class DefaultPortalService implements PortalService {
  constructor(private readonly store: PortalStore, private readonly clock: Clock) {}

  private now(): IsoTimestamp {
    return this.clock.nowIso();
  }

  async createApp(input: CreateDeveloperApp): Promise<Result<DeveloperApp>> {
    const app = createDeveloperApp(input, this.now());
    return this.store.saveApp(app);
  }

  async getApp(id: string): Promise<Result<DeveloperApp>> {
    return this.store.getApp(id);
  }

  async listApps(organizationId: string): Promise<Result<DeveloperApp[]>> {
    return this.store.listApps(organizationId);
  }

  async updateApp(id: string, patch: UpdateDeveloperApp): Promise<Result<DeveloperApp>> {
    const result = await this.store.getApp(id);
    if (isErr(result)) return result;
    const updated = updateApp(result.value, patch, this.now());
    return this.store.saveApp(updated);
  }

  async suspendApp(id: string): Promise<Result<DeveloperApp>> {
    const result = await this.store.getApp(id);
    if (isErr(result)) return result;
    return this.store.saveApp(suspendApp(result.value, this.now()));
  }

  async activateApp(id: string): Promise<Result<DeveloperApp>> {
    const result = await this.store.getApp(id);
    if (isErr(result)) return result;
    return this.store.saveApp(activateApp(result.value, this.now()));
  }

  async deleteApp(id: string): Promise<Result<DeveloperApp>> {
    const result = await this.store.getApp(id);
    if (isErr(result)) return result;
    return this.store.saveApp(deleteApp(result.value, this.now()));
  }

  async inviteMember(input: InviteTeamMember, requestorRole: string): Promise<Result<TeamMember>> {
    if (!canManageMembers(requestorRole as never)) {
      return err(new ForbiddenError({ message: "Only owners and admins can invite members" }));
    }
    const existing = await this.store.getMemberByEmail(input.appId, input.email);
    if (!isErr(existing)) {
      return err(new ConflictError({ message: `Member ${input.email} already exists in app` }));
    }
    const member = inviteTeamMember(input, this.now());
    return this.store.saveMember(member);
  }

  async acceptInvite(memberId: string, userId: string): Promise<Result<TeamMember>> {
    const result = await this.store.getMember(memberId);
    if (isErr(result)) return result;
    return this.store.saveMember(acceptInvite(result.value, userId, this.now()));
  }

  async updateMember(id: string, patch: UpdateTeamMember, requestorRole: string): Promise<Result<TeamMember>> {
    if (!canManageMembers(requestorRole as never)) {
      return err(new ForbiddenError({ message: "Only owners and admins can update members" }));
    }
    const result = await this.store.getMember(id);
    if (isErr(result)) return result;
    return this.store.saveMember(updateTeamMember(result.value, patch, this.now()));
  }

  async removeMember(id: string, requestorRole: string): Promise<Result<TeamMember>> {
    if (!canManageMembers(requestorRole as never)) {
      return err(new ForbiddenError({ message: "Only owners and admins can remove members" }));
    }
    const result = await this.store.getMember(id);
    if (isErr(result)) return result;
    return this.store.saveMember(removeTeamMember(result.value, this.now()));
  }

  async listMembers(appId: string): Promise<Result<TeamMember[]>> {
    return this.store.listMembers(appId);
  }

  async createEnvironment(input: CreateAppEnvironment): Promise<Result<AppEnvironment>> {
    const env = createAppEnvironment(input, this.now());
    return this.store.saveEnvironment(env);
  }

  async getEnvironment(id: string): Promise<Result<AppEnvironment>> {
    const result = await this.store.getEnvironment(id);
    if (isErr(result)) return result;
    return ok(maskSecrets(result.value));
  }

  async listEnvironments(appId: string): Promise<Result<AppEnvironment[]>> {
    const result = await this.store.listEnvironments(appId);
    if (isErr(result)) return result;
    return ok(result.value.map(maskSecrets));
  }

  async updateEnvironment(id: string, patch: UpdateAppEnvironment): Promise<Result<AppEnvironment>> {
    const result = await this.store.getEnvironment(id);
    if (isErr(result)) return result;
    return this.store.saveEnvironment(updateAppEnvironment(result.value, patch, this.now()));
  }

  async archiveEnvironment(id: string): Promise<Result<AppEnvironment>> {
    const result = await this.store.getEnvironment(id);
    if (isErr(result)) return result;
    return this.store.saveEnvironment(archiveEnvironment(result.value, this.now()));
  }

  async setVariable(envId: string, variable: EnvironmentVariable): Promise<Result<AppEnvironment>> {
    const result = await this.store.getEnvironment(envId);
    if (isErr(result)) return result;
    return this.store.saveEnvironment(setVariable(result.value, variable, this.now()));
  }

  async removeVariable(envId: string, key: string): Promise<Result<AppEnvironment>> {
    const result = await this.store.getEnvironment(envId);
    if (isErr(result)) return result;
    return this.store.saveEnvironment(removeVariable(result.value, key, this.now()));
  }

  async createWebhookConfig(input: CreateWebhookConfig): Promise<Result<WebhookConfig>> {
    const config = createWebhookConfig(input, this.now());
    return this.store.saveWebhookConfig(config);
  }

  async getWebhookConfig(id: string): Promise<Result<WebhookConfig>> {
    return this.store.getWebhookConfig(id);
  }

  async listWebhookConfigs(appId: string): Promise<Result<WebhookConfig[]>> {
    return this.store.listWebhookConfigs(appId);
  }

  async updateWebhookConfig(id: string, patch: UpdateWebhookConfig): Promise<Result<WebhookConfig>> {
    const result = await this.store.getWebhookConfig(id);
    if (isErr(result)) return result;
    return this.store.saveWebhookConfig(updateWebhookConfig(result.value, patch, this.now()));
  }

  async disableWebhook(id: string): Promise<Result<WebhookConfig>> {
    const result = await this.store.getWebhookConfig(id);
    if (isErr(result)) return result;
    return this.store.saveWebhookConfig(disableWebhook(result.value, this.now()));
  }

  async enableWebhook(id: string): Promise<Result<WebhookConfig>> {
    const result = await this.store.getWebhookConfig(id);
    if (isErr(result)) return result;
    return this.store.saveWebhookConfig(enableWebhook(result.value, this.now()));
  }

  async recordDeliverySuccess(id: string): Promise<Result<WebhookConfig>> {
    const result = await this.store.getWebhookConfig(id);
    if (isErr(result)) return result;
    return this.store.saveWebhookConfig(recordDeliverySuccess(result.value, this.now()));
  }

  async recordDeliveryFailure(id: string): Promise<Result<WebhookConfig>> {
    const result = await this.store.getWebhookConfig(id);
    if (isErr(result)) return result;
    return this.store.saveWebhookConfig(recordDeliveryFailure(result.value, this.now()));
  }
}
