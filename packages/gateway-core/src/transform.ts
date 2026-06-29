// Request/response transform pipeline for the gateway layer.
import { type JsonValue, isObject } from "@veritas/core";

export interface GatewayRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body: JsonValue;
}

export interface GatewayResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: JsonValue;
}

export type RequestTransformer = (req: GatewayRequest) => GatewayRequest;
export type ResponseTransformer = (res: GatewayResponse) => GatewayResponse;

export interface TransformPipeline {
  readonly requestTransformers: ReadonlyArray<RequestTransformer>;
  readonly responseTransformers: ReadonlyArray<ResponseTransformer>;
}

export function applyRequestTransforms(
  req: GatewayRequest,
  transformers: ReadonlyArray<RequestTransformer>,
): GatewayRequest {
  return transformers.reduce((acc, fn) => fn(acc), req);
}

export function applyResponseTransforms(
  res: GatewayResponse,
  transformers: ReadonlyArray<ResponseTransformer>,
): GatewayResponse {
  return transformers.reduce((acc, fn) => fn(acc), res);
}

export function addRequestHeader(key: string, value: string): RequestTransformer {
  return (req) => ({
    ...req,
    headers: { ...req.headers, [key]: value },
  });
}

export function removeRequestHeader(key: string): RequestTransformer {
  const lower = key.toLowerCase();
  return (req) => {
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => k.toLowerCase() !== lower),
    );
    return { ...req, headers };
  };
}

export function addResponseHeader(key: string, value: string): ResponseTransformer {
  return (res) => ({
    ...res,
    headers: { ...res.headers, [key]: value },
  });
}

export function rewritePath(from: RegExp, to: string): RequestTransformer {
  return (req) => ({ ...req, path: req.path.replace(from, to) });
}

export function injectBodyField(key: string, value: JsonValue): RequestTransformer {
  return (req) => {
    if (!isObject(req.body)) return req;
    return { ...req, body: { ...(req.body as Record<string, JsonValue>), [key]: value } };
  };
}

export function buildPipeline(
  requestTransformers: ReadonlyArray<RequestTransformer>,
  responseTransformers: ReadonlyArray<ResponseTransformer>,
): TransformPipeline {
  return { requestTransformers, responseTransformers };
}
