// Service-catalog application service: manages priced CAP services offered by Veritas.
import type { Result, Logger, Page, PageRequest } from "@veritas/core";
import { ok, err, isErr } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { Service } from "@veritas/contracts";
import type { ServiceRepository } from "@veritas/persistence";
import type { ServiceContext } from "../service-context.js";
import { ResourceNotFoundError, DuplicateResourceError, InsufficientPermissionsError } from "../errors.js";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  ListServicesInput,
  ServiceOutput,
  ServiceListOutput,
  SetServiceActiveInput,
} from "./service-catalog.dto.js";

/** Deps injected into ServiceCatalogService. */
export interface ServiceCatalogServiceDeps {
  readonly serviceRepo: ServiceRepository;
  readonly logger: Logger;
}

/** Application service for managing the CAP service catalog. */
export class ServiceCatalogService {
  private readonly repo: ServiceRepository;
  private readonly logger: Logger;

  constructor(deps: ServiceCatalogServiceDeps) {
    this.repo = deps.serviceRepo;
    this.logger = deps.logger;
  }

  /** Create and publish a new priced service. Requires system or admin role. */
  async createService(
    ctx: ServiceContext,
    input: CreateServiceInput,
  ): Promise<Result<ServiceOutput, AppError>> {
    if (!ctx.principal.roles.includes("admin") && !ctx.principal.roles.includes("system")) {
      return err(new InsufficientPermissionsError("create:service"));
    }

    const existingResult = await this.repo.findBySlug(input.slug);
    if (existingResult.ok) {
      return err(new DuplicateResourceError("Service", "slug", input.slug));
    }

    const createResult = await this.repo.create({ ...input, active: input.active ?? true });
    if (isErr(createResult)) return err(createResult.error as AppError);

    this.logger.info("service_catalog.created", {
      traceId: ctx.traceId,
      serviceId: createResult.value.id,
      slug: input.slug,
    });
    return ok(createResult.value);
  }

  /** Retrieve a single service by its opaque ID. */
  async getService(
    _ctx: ServiceContext,
    serviceId: string,
  ): Promise<Result<ServiceOutput, AppError>> {
    const result = await this.repo.findById(serviceId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Service", serviceId));
    }
    return ok(result.value);
  }

  /** Retrieve a single service by its unique slug. */
  async getServiceBySlug(
    _ctx: ServiceContext,
    slug: string,
  ): Promise<Result<ServiceOutput, AppError>> {
    const result = await this.repo.findBySlug(slug);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Service", `slug:${slug}`));
    }
    return ok(result.value);
  }

  /** List services from the catalog, optionally filtering to active only. */
  async listServices(
    _ctx: ServiceContext,
    input: ListServicesInput,
  ): Promise<Result<ServiceListOutput, AppError>> {
    const pageReq: PageRequest = { limit: input.limit ?? 20, cursor: input.cursor };

    const result = input.activeOnly
      ? await this.repo.findActive({ page: pageReq } as Parameters<ServiceRepository["findActive"]>[0])
      : await this.repo.list({ page: pageReq } as Parameters<ServiceRepository["list"]>[0]);

    if (isErr(result)) return err(result.error as AppError);

    const data: Page<Service> = result.value;
    return ok({
      items: [...data.items],
      nextCursor: data.nextCursor ?? null,
      total: data.items.length,
    });
  }

  /** Update mutable fields of an existing service. Requires admin or system role. */
  async updateService(
    ctx: ServiceContext,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<Result<ServiceOutput, AppError>> {
    if (!ctx.principal.roles.includes("admin") && !ctx.principal.roles.includes("system")) {
      return err(new InsufficientPermissionsError("update:service"));
    }

    const existing = await this.repo.findById(serviceId);
    if (isErr(existing)) {
      return err(new ResourceNotFoundError("Service", serviceId));
    }

    if (input.slug !== undefined && input.slug !== existing.value.slug) {
      const slugCheck = await this.repo.findBySlug(input.slug);
      if (slugCheck.ok) {
        return err(new DuplicateResourceError("Service", "slug", input.slug));
      }
    }

    const updated = await this.repo.update(serviceId, input);
    if (isErr(updated)) return err(updated.error as AppError);

    this.logger.info("service_catalog.updated", { traceId: ctx.traceId, serviceId });
    return ok(updated.value);
  }

  /** Toggle the active flag on a service. Requires admin or system role. */
  async setServiceActive(
    ctx: ServiceContext,
    input: SetServiceActiveInput,
  ): Promise<Result<ServiceOutput, AppError>> {
    if (!ctx.principal.roles.includes("admin") && !ctx.principal.roles.includes("system")) {
      return err(new InsufficientPermissionsError("update:service:active"));
    }

    const updated = await this.repo.update(input.serviceId, { active: input.active });
    if (isErr(updated)) {
      return err(new ResourceNotFoundError("Service", input.serviceId));
    }

    this.logger.info("service_catalog.active_changed", {
      traceId: ctx.traceId,
      serviceId: input.serviceId,
      active: input.active,
    });
    return ok(updated.value);
  }

  /** Permanently delete a service. Requires admin or system role. */
  async deleteService(
    ctx: ServiceContext,
    serviceId: string,
  ): Promise<Result<void, AppError>> {
    if (!ctx.principal.roles.includes("admin") && !ctx.principal.roles.includes("system")) {
      return err(new InsufficientPermissionsError("delete:service"));
    }

    const result = await this.repo.delete(serviceId);
    if (isErr(result)) {
      return err(new ResourceNotFoundError("Service", serviceId));
    }

    this.logger.info("service_catalog.deleted", { traceId: ctx.traceId, serviceId });
    return ok(undefined);
  }
}
