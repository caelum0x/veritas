// Apps feature service — delegates create/read/update/lifecycle operations to PortalService
import { isErr, type Result } from "@veritas/core";
import {
  type PortalService,
  type DeveloperApp,
  type CreateDeveloperApp,
  type UpdateDeveloperApp,
} from "@veritas/developer-portal";
import type { Logger } from "@veritas/observability";
import type { CreateAppBody, UpdateAppBody } from "./apps.schema.js";

export interface AppsDeps {
  readonly portalService: PortalService;
  readonly logger: Logger;
}

export class AppsService {
  private readonly svc: PortalService;
  private readonly log: Logger;

  constructor(deps: AppsDeps) {
    this.svc = deps.portalService;
    this.log = deps.logger;
  }

  async listApps(organizationId: string): Promise<Result<DeveloperApp[]>> {
    this.log.debug("AppsService.listApps", { organizationId });
    return this.svc.listApps(organizationId);
  }

  async getApp(id: string): Promise<Result<DeveloperApp>> {
    this.log.debug("AppsService.getApp", { id });
    return this.svc.getApp(id);
  }

  async createApp(body: CreateAppBody): Promise<Result<DeveloperApp>> {
    const input: CreateDeveloperApp = {
      organizationId: body.organizationId,
      ownerId: body.ownerId,
      name: body.name,
      description: body.description,
      websiteUrl: body.websiteUrl,
      logoUrl: body.logoUrl,
      environments: body.environments,
      metadata: body.metadata,
    };
    this.log.info("AppsService.createApp", { organizationId: body.organizationId, name: body.name });
    const result = await this.svc.createApp(input);
    if (isErr(result)) {
      this.log.warn("AppsService.createApp failed", { error: result.error.message });
    }
    return result;
  }

  async updateApp(id: string, body: UpdateAppBody): Promise<Result<DeveloperApp>> {
    const patch: UpdateDeveloperApp = {
      name: body.name,
      description: body.description,
      websiteUrl: body.websiteUrl,
      logoUrl: body.logoUrl,
      environments: body.environments,
      metadata: body.metadata,
    };
    this.log.info("AppsService.updateApp", { id });
    const result = await this.svc.updateApp(id, patch);
    if (isErr(result)) {
      this.log.warn("AppsService.updateApp failed", { id, error: result.error.message });
    }
    return result;
  }

  async suspendApp(id: string): Promise<Result<DeveloperApp>> {
    this.log.info("AppsService.suspendApp", { id });
    const result = await this.svc.suspendApp(id);
    if (isErr(result)) {
      this.log.warn("AppsService.suspendApp failed", { id, error: result.error.message });
    }
    return result;
  }

  async activateApp(id: string): Promise<Result<DeveloperApp>> {
    this.log.info("AppsService.activateApp", { id });
    const result = await this.svc.activateApp(id);
    if (isErr(result)) {
      this.log.warn("AppsService.activateApp failed", { id, error: result.error.message });
    }
    return result;
  }

  async deleteApp(id: string): Promise<Result<DeveloperApp>> {
    this.log.info("AppsService.deleteApp", { id });
    const result = await this.svc.deleteApp(id);
    if (isErr(result)) {
      this.log.warn("AppsService.deleteApp failed", { id, error: result.error.message });
    }
    return result;
  }
}
