// Resolve a Tenant from principal, hostname, or request header
import { Result, ok, err } from "@veritas/core";
import { Tenant, TenantId, asTenantId } from "./tenant.js";
import { TenantStore } from "./tenant-store.js";

export type ResolutionStrategy = "header" | "host" | "slug" | "id";

export interface ResolveByHeaderOptions {
  readonly strategy: "header";
  readonly headerValue: string;
}

export interface ResolveByHostOptions {
  readonly strategy: "host";
  readonly hostname: string;
}

export interface ResolveBySlugOptions {
  readonly strategy: "slug";
  readonly slug: string;
}

export interface ResolveByIdOptions {
  readonly strategy: "id";
  readonly tenantId: string;
}

export type ResolveOptions =
  | ResolveByHeaderOptions
  | ResolveByHostOptions
  | ResolveBySlugOptions
  | ResolveByIdOptions;

export class TenantResolver {
  constructor(private readonly store: TenantStore) {}

  async resolve(options: ResolveOptions): Promise<Result<Tenant, Error>> {
    switch (options.strategy) {
      case "id":
        return this.resolveById(asTenantId(options.tenantId));
      case "slug":
        return this.resolveBySlug(options.slug);
      case "host":
        return this.resolveByHost(options.hostname);
      case "header":
        return this.resolveByHeader(options.headerValue);
      default:
        return assertNeverStrategy(options);
    }
  }

  private async resolveById(id: TenantId): Promise<Result<Tenant, Error>> {
    const tenant = await this.store.findById(id);
    if (tenant === undefined) {
      return err(new Error(`Tenant not found for id: ${id}`));
    }
    return ok(tenant);
  }

  private async resolveBySlug(slug: string): Promise<Result<Tenant, Error>> {
    const tenant = await this.store.findBySlug(slug);
    if (tenant === undefined) {
      return err(new Error(`Tenant not found for slug: ${slug}`));
    }
    return ok(tenant);
  }

  private async resolveByHost(hostname: string): Promise<Result<Tenant, Error>> {
    const subdomain = extractSubdomain(hostname);
    if (subdomain === undefined) {
      return err(new Error(`Cannot extract tenant slug from hostname: ${hostname}`));
    }
    return this.resolveBySlug(subdomain);
  }

  private async resolveByHeader(headerValue: string): Promise<Result<Tenant, Error>> {
    const trimmed = headerValue.trim();
    if (trimmed.length === 0) {
      return err(new Error("Tenant header is empty"));
    }
    return this.resolveBySlug(trimmed);
  }
}

function extractSubdomain(hostname: string): string | undefined {
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return undefined;
}

function assertNeverStrategy(options: never): Result<Tenant, Error> {
  return err(new Error(`Unknown resolution strategy: ${JSON.stringify(options)}`));
}
