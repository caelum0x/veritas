// Port interface for a gRPC client — call/stream lifecycle without real network
import type { Result } from '@veritas/core';
import type { ServiceDescriptor } from './service.js';
import type { GrpcMetadata } from './metadata.js';
import type { GrpcStatusObject } from './status.js';
import type { GrpcClientInterceptor } from './interceptor.js';

export interface GrpcClientOptions {
  readonly host: string;
  readonly port: number;
  readonly credentials?: 'insecure' | 'tls';
  readonly maxReceiveMessageSize?: number;
  readonly maxSendMessageSize?: number;
  readonly defaultDeadlineMs?: number;
  readonly interceptors?: ReadonlyArray<GrpcClientInterceptor>;
}

export interface GrpcCallOptions {
  readonly metadata?: GrpcMetadata;
  readonly deadlineMs?: number;
}

export interface GrpcClientPort {
  connect(): Promise<Result<void>>;
  close(): Promise<Result<void>>;
  call<TReq, TRes>(
    service: ServiceDescriptor,
    method: string,
    request: TReq,
    options?: GrpcCallOptions,
  ): Promise<Result<TRes, GrpcStatusObject>>;
  serverStream<TReq, TRes>(
    service: ServiceDescriptor,
    method: string,
    request: TReq,
    onMessage: (msg: TRes) => void,
    options?: GrpcCallOptions,
  ): Promise<Result<void, GrpcStatusObject>>;
  clientStream<TReq, TRes>(
    service: ServiceDescriptor,
    method: string,
    requests: ReadonlyArray<TReq>,
    options?: GrpcCallOptions,
  ): Promise<Result<TRes, GrpcStatusObject>>;
  bidiStream<TReq, TRes>(
    service: ServiceDescriptor,
    method: string,
    requests: ReadonlyArray<TReq>,
    onMessage: (msg: TRes) => void,
    options?: GrpcCallOptions,
  ): Promise<Result<void, GrpcStatusObject>>;
}

export function makeClientAddress(opts: GrpcClientOptions): string {
  return `${opts.host}:${opts.port}`;
}

export function defaultClientOptions(
  overrides: Partial<GrpcClientOptions> & { host: string; port: number },
): GrpcClientOptions {
  return Object.freeze({
    credentials: 'insecure' as const,
    maxReceiveMessageSize: 4 * 1024 * 1024,
    maxSendMessageSize: 4 * 1024 * 1024,
    defaultDeadlineMs: 30_000,
    interceptors: [],
    ...overrides,
  });
}

export interface StubMethod<TReq, TRes> {
  (request: TReq, options?: GrpcCallOptions): Promise<Result<TRes, GrpcStatusObject>>;
}

export type ServiceStub<TMethods extends string> = Readonly<
  Record<TMethods, StubMethod<unknown, unknown>>
>;

export function makeStub<TMethods extends string>(
  client: GrpcClientPort,
  service: ServiceDescriptor,
  methods: ReadonlyArray<TMethods>,
): ServiceStub<TMethods> {
  const stub: Record<string, StubMethod<unknown, unknown>> = {};
  for (const method of methods) {
    stub[method] = (request: unknown, options?: GrpcCallOptions) =>
      client.call(service, method, request, options);
  }
  return Object.freeze(stub) as ServiceStub<TMethods>;
}
