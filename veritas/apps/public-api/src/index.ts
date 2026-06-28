// index.ts: public surface of @veritas/public-api — re-exports all externally-relevant symbols.
export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export type { RouterDeps } from "./router.js";
export { buildContainer } from "./container.js";
export type { Deps } from "./container.js";
export { loadConfig } from "./config.js";
export type { AppConfig } from "./config.js";
export { ApiError, toHttpError } from "./http/api-error.js";
export { openApiDocument } from "./openapi.js";
export type { OpenApiDocument } from "./openapi.js";
export {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPage,
  sendError,
  defaultResponder,
} from "./http/responder.js";
export type { Responder } from "./http/responder.js";
