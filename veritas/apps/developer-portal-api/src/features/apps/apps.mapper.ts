// Maps DeveloperApp domain entities to HTTP response DTOs
import type { DeveloperApp } from "@veritas/developer-portal";

export interface AppDto {
  readonly id: string;
  readonly organizationId: string;
  readonly ownerId: string;
  readonly name: string;
  readonly description?: string;
  readonly websiteUrl?: string;
  readonly logoUrl?: string;
  readonly environments: readonly string[];
  readonly status: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toAppDto(app: DeveloperApp): AppDto {
  return {
    id: app.id,
    organizationId: app.organizationId,
    ownerId: app.ownerId,
    name: app.name,
    description: app.description,
    websiteUrl: app.websiteUrl,
    logoUrl: app.logoUrl,
    environments: app.environments,
    status: app.status,
    metadata: app.metadata,
    createdAt: app.timestamps.createdAt,
    updatedAt: app.timestamps.updatedAt,
  };
}

export function toAppDtoList(apps: readonly DeveloperApp[]): readonly AppDto[] {
  return apps.map(toAppDto);
}
