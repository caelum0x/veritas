// Port interface for a gRPC server — bind/start/stop lifecycle without real network
import type { Result } from '@veritas/core';
import type { ServiceDescriptor } from './service.js';

export interface GrpcServerOptions {
  readonly host: string;
  readonly port: number;
  readonly maxReceiveMessageSize?: number;
  readonly maxSendMessageSize?: number;
  readonly credentials?: 'insecure' | 'tls';
}

export interface GrpcServerHandler<TReq, TRes> {
  (request: TReq, metadata: Readonly<Record<string, string>>): Promise<TRes>;
}

export interface ServiceRegistration {
  readonly service: ServiceDescriptor;
  readonly handlers: Readonly<Record<string, GrpcServerHandler<unknown, unknown>>>;
}

export interface GrpcServerPort {
  register(registration: ServiceRegistration): void;
  start(): Promise<Result<void>>;
  stop(): Promise<Result<void>>;
  address(): string | null;
}

export function makeServerAddress(opts: GrpcServerOptions): string {
  return `${opts.host}:${opts.port}`;
}

export function defaultServerOptions(
  overrides: Partial<GrpcServerOptions> & { port: number },
): GrpcServerOptions {
  return Object.freeze({
    host: '0.0.0.0',
    maxReceiveMessageSize: 4 * 1024 * 1024,
    maxSendMessageSize: 4 * 1024 * 1024,
    credentials: 'insecure' as const,
    ...overrides,
  });
}
