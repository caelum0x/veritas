// Webhooks feature service: delegates CRUD and delivery operations to @veritas/services WebhookService.
import { isErr, epochToIso, newId, type Result } from "@veritas/core";
import {
  WebhookService,
  makeServiceContext,
  type CreateWebhookInput,
  type UpdateWebhookInput,
  type ListWebhooksInput,
  type ListWebhookDeliveriesInput,
  type RetryWebhookDeliveryInput,
  type WebhookOutput,
  type WebhookDeliveryOutput,
  type WebhookListOutput,
  type WebhookDeliveryListOutput,
} from "@veritas/services";
import type { AppError } from "@veritas/core";
import type { Container } from "@veritas/container";
import { WEBHOOK_SVC, LOGGER } from "@veritas/container/tokens";
import type { Logger } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

/** Resolved dependencies for the webhooks feature. */
export interface WebhooksDeps {
  readonly webhookService: WebhookService;
  readonly logger: Logger;
}

/** Resolve webhook dependencies from the DI container. */
export function resolveWebhooksDeps(container: Container): WebhooksDeps {
  return {
    webhookService: container.resolve(WEBHOOK_SVC) as WebhookService,
    logger: container.resolve(LOGGER) as Logger,
  };
}

/** Build a ServiceContext from an authenticated HTTP request. */
function makeCtx(req: AuthenticatedRequest) {
  const reqId = newId("req");
  return makeServiceContext(
    {
      userId: req.userId ?? "anonymous",
      orgId: req.orgId,
      roles: req.scopes ?? [],
      apiKeyId: req.apiKeyId,
    },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

/** Register a new webhook endpoint. */
export async function createWebhook(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  input: CreateWebhookInput,
): Promise<Result<WebhookOutput, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.create(ctx, input);
}

/** Retrieve a single webhook by its ID. */
export async function getWebhookById(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  webhookId: string,
): Promise<Result<WebhookOutput, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.getById(ctx, webhookId);
}

/** Update mutable fields of a webhook. */
export async function updateWebhook(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<Result<WebhookOutput, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.update(ctx, webhookId, input);
}

/** Delete (unregister) a webhook endpoint. */
export async function deleteWebhook(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  webhookId: string,
): Promise<Result<void, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.delete(ctx, webhookId);
}

/** List webhooks with optional filters and pagination. */
export async function listWebhooks(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  input: ListWebhooksInput,
): Promise<Result<WebhookListOutput, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.list(ctx, input);
}

/** List delivery attempts for a specific webhook. */
export async function listWebhookDeliveries(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  input: ListWebhookDeliveriesInput,
): Promise<Result<WebhookDeliveryListOutput, AppError>> {
  const ctx = makeCtx(req);
  return deps.webhookService.listDeliveries(ctx, input);
}

/** Manually trigger a retry of a failed delivery attempt. */
export async function retryWebhookDelivery(
  deps: WebhooksDeps,
  req: AuthenticatedRequest,
  deliveryId: string,
): Promise<Result<WebhookDeliveryOutput, AppError>> {
  const ctx = makeCtx(req);
  const input: RetryWebhookDeliveryInput = { deliveryId };
  return deps.webhookService.retryDelivery(ctx, input);
}
