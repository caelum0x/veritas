// gRPC interceptor — composable middleware for client and server call pipelines
import type { Result } from '@veritas/core';
import type { GrpcMetadata } from './metadata.js';
import type { GrpcStatusObject } from './status.js';

export interface GrpcCallContext {
  readonly method: string;
  readonly service: string;
  readonly metadata: GrpcMetadata;
}

export interface GrpcServerCallContext extends GrpcCallContext {
  readonly peer: string;
}

export interface GrpcClientCallContext extends GrpcCallContext {
  readonly deadline?: number;
}

export type GrpcHandler<TReq, TRes> = (
  request: TReq,
  context: GrpcCallContext,
) => Promise<Result<TRes, GrpcStatusObject>>;

export type GrpcServerInterceptor<TReq = unknown, TRes = unknown> = (
  request: TReq,
  context: GrpcServerCallContext,
  next: GrpcHandler<TReq, TRes>,
) => Promise<Result<TRes, GrpcStatusObject>>;

export type GrpcClientInterceptor<TReq = unknown, TRes = unknown> = (
  request: TReq,
  context: GrpcClientCallContext,
  next: GrpcHandler<TReq, TRes>,
) => Promise<Result<TRes, GrpcStatusObject>>;

export function composeServerInterceptors<TReq, TRes>(
  interceptors: ReadonlyArray<GrpcServerInterceptor<TReq, TRes>>,
  handler: GrpcHandler<TReq, TRes>,
): GrpcHandler<TReq, TRes> {
  return interceptors.reduceRight<GrpcHandler<TReq, TRes>>(
    (next, interceptor) =>
      (req: TReq, ctx: GrpcCallContext) =>
        interceptor(req, ctx as GrpcServerCallContext, next),
    handler,
  );
}

export function composeClientInterceptors<TReq, TRes>(
  interceptors: ReadonlyArray<GrpcClientInterceptor<TReq, TRes>>,
  handler: GrpcHandler<TReq, TRes>,
): GrpcHandler<TReq, TRes> {
  return interceptors.reduceRight<GrpcHandler<TReq, TRes>>(
    (next, interceptor) =>
      (req: TReq, ctx: GrpcCallContext) =>
        interceptor(req, ctx as GrpcClientCallContext, next),
    handler,
  );
}

export function loggingInterceptor<TReq, TRes>(
  log: (msg: string, data: Readonly<Record<string, unknown>>) => void,
): GrpcServerInterceptor<TReq, TRes> {
  return async (request, context, next) => {
    const start = Date.now();
    const result = await next(request, context);
    const duration = Date.now() - start;
    log('grpc call', {
      service: context.service,
      method: context.method,
      ok: result.ok,
      durationMs: duration,
    });
    return result;
  };
}

export function deadlineInterceptor<TReq, TRes>(
  defaultDeadlineMs: number = 30_000,
): GrpcClientInterceptor<TReq, TRes> {
  return async (request, context, next) => {
    const deadline = context.deadline ?? (Date.now() + defaultDeadlineMs);
    const timeout = deadline - Date.now();
    if (timeout <= 0) {
      const { GrpcStatus, makeStatus } = await import('./status.js');
      return { ok: false, error: makeStatus(GrpcStatus.DEADLINE_EXCEEDED, 'deadline exceeded') };
    }
    const timer = new Promise<Result<TRes, GrpcStatusObject>>(resolve => {
      setTimeout(async () => {
        const { GrpcStatus, makeStatus } = await import('./status.js');
        resolve({ ok: false, error: makeStatus(GrpcStatus.DEADLINE_EXCEEDED, 'deadline exceeded') });
      }, timeout);
    });
    return Promise.race([next(request, context), timer]);
  };
}
