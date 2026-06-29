// Public surface re-export for the @veritas/status-page module.
export { loadConfig, type AppConfig } from "./config.js";
export { buildContainer, type Deps } from "./container.js";
export { buildApp } from "./app.js";
export { buildRouter } from "./router.js";
export { startServer } from "./server.js";
export { bootstrap, type BootstrapResult } from "./bootstrap.js";
export { checkHealth, isHealthy } from "./health.js";
export { registerShutdownHandlers } from "./shutdown.js";
export {
  HttpError,
  BadRequestError,
  NotFoundHttpError,
  ConflictHttpError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalHttpError,
  isHttpError,
} from "./errors.js";
export { ApiError, isApiError } from "./http/api-error.js";
export { asyncHandler } from "./http/async-handler.js";
export {
  sendOk,
  sendCreated,
  sendNoContent,
  sendPage,
  sendError,
  sendNotFound,
  sendBadRequest,
  sendInternalError,
} from "./http/responder.js";
