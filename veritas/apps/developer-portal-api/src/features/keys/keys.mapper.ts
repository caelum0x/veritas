// Maps PortalApiKey domain entities to HTTP response DTOs
import type { PortalApiKey, PortalApiKeyWithSecret } from "@veritas/developer-portal";

export interface KeyDto {
  readonly id: string;
  readonly appId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly keyPrefix: string;
  readonly environment: string;
  readonly scopes: readonly string[];
  readonly status: string;
  readonly expiresAt?: string;
  readonly lastUsedAt?: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KeyWithSecretDto extends KeyDto {
  readonly secret: string;
}

export function toKeyDto(key: PortalApiKey): KeyDto {
  return {
    id: key.id,
    appId: key.appId,
    organizationId: key.organizationId,
    name: key.name,
    keyPrefix: key.keyPrefix,
    environment: key.environment,
    scopes: key.scopes,
    status: key.status,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    metadata: key.metadata,
    createdAt: key.timestamps.createdAt,
    updatedAt: key.timestamps.updatedAt,
  };
}

export function toKeyWithSecretDto(key: PortalApiKeyWithSecret): KeyWithSecretDto {
  return {
    ...toKeyDto(key),
    secret: key.secret,
  };
}

export function toKeyDtoList(keys: readonly PortalApiKey[]): readonly KeyDto[] {
  return keys.map(toKeyDto);
}
