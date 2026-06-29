// Flow: publish a marketplace service listing — create draft → register on-chain → transition to pending_review.

import {
  type Result,
  ok,
  err,
  epochToIso,
  type EventBus,
  type Logger,
  noopLogger,
  asScore,
} from "@veritas/core";
import type { Service } from "@veritas/contracts";
import {
  type ListingStore,
  publishListing,
} from "@veritas/marketplace";
import type { ServiceRegistryPort, ServiceMetadata } from "@veritas/registry-onchain";
import { ListingPublishError } from "./errors.js";
import {
  makeListingPublishedEvent,
  type ListingPublishedPayload,
} from "./events.js";

export interface PublishServiceInput {
  readonly agentId: string;
  readonly service: Service;
  readonly categoryId: string;
  readonly tagIds?: readonly string[];
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly metadataUri: string;
  readonly ownerAddress: string;
}

export interface PublishServiceOutput {
  readonly listingId: string;
  readonly registryId: string;
  readonly status: string;
}

export interface PublishServiceFlowDeps {
  readonly listingStore: ListingStore;
  readonly serviceRegistry: ServiceRegistryPort;
  readonly eventBus?: EventBus;
  readonly logger?: Logger;
}

/** Create and publish a marketplace service listing with on-chain service registration. */
export async function publishServiceFlow(
  input: PublishServiceInput,
  deps: PublishServiceFlowDeps,
): Promise<Result<PublishServiceOutput>> {
  const log = deps.logger ?? noopLogger;
  const now = epochToIso(Date.now());

  // Step 1: build draft listing compatible with ListingStore (types.ts Listing shape)
  type StoreListing = Parameters<ListingStore["save"]>[0];
  const listing: StoreListing = {
    id: `lst_${input.agentId.slice(0, 8)}_${Date.now()}` as StoreListing["id"],
    serviceId: input.service.id,
    service: input.service,
    categoryId: input.categoryId as StoreListing["categoryId"],
    tagIds: (input.tagIds ?? []) as StoreListing["tagIds"],
    title: input.title.trim(),
    summary: input.summary.trim(),
    description: input.description.trim(),
    price: input.service.basePrice,
    status: "draft",
    featuredUntil: undefined,
    averageRating: 0,
    reviewCount: 0,
    orderCount: 0,
    relevanceScore: asScore(0),
    createdAt: now,
    updatedAt: now,
  };

  // Step 2: persist draft listing
  const saveResult = await deps.listingStore.save(listing);
  if (!saveResult.ok) {
    log.error("publish-service: failed to save draft listing", { serviceId: input.service.id });
    const saveErr = saveResult.error;
    const saveMsg = saveErr instanceof Error ? saveErr.message : String(saveErr);
    return err(
      new ListingPublishError(`Failed to save listing draft: ${saveMsg}`, {
        cause: saveErr,
      }),
    );
  }
  const savedListing = saveResult.value;
  log.info("publish-service: draft listing created", { listingId: savedListing.id });

  // Step 3: register service on-chain
  const serviceMeta: ServiceMetadata = {
    slug: input.service.slug,
    name: input.service.name,
    description: input.service.description,
    inputSchemaRef: input.service.inputSchemaRef ?? null,
    outputSchemaRef: input.service.outputSchemaRef ?? null,
    version: "1.0.0",
  };
  const registryResult = await deps.serviceRegistry.register({
    owner: input.ownerAddress as Parameters<ServiceRegistryPort["register"]>[0]["owner"],
    metadataUri: input.metadataUri,
    metadata: serviceMeta,
  });
  if (!registryResult.ok) {
    log.error("publish-service: on-chain service registration failed", { serviceId: input.service.id });
    const registryErr = registryResult.error;
    const registryMsg = registryErr instanceof Error ? registryErr.message : String(registryErr);
    return err(
      new ListingPublishError(
        `On-chain service registration failed: ${registryMsg}`,
        { cause: registryErr },
      ),
    );
  }
  const registryRecord = registryResult.value;
  log.info("publish-service: service registered on-chain", { registryId: registryRecord.id });

  // Step 4: transition listing to pending_review
  const publishResult = await publishListing(deps.listingStore, {
    listingId: savedListing.id,
    sellerId: input.agentId,
  });
  if (!publishResult.ok) {
    log.error("publish-service: failed to publish listing", { listingId: savedListing.id });
    const publishErr = publishResult.error;
    const publishMsg = publishErr instanceof Error ? publishErr.message : String(publishErr);
    return err(
      new ListingPublishError(
        `Failed to publish listing ${savedListing.id}: ${publishMsg}`,
        { cause: publishErr },
      ),
    );
  }
  const publishedListing = publishResult.value;
  log.info("publish-service: listing published", { listingId: publishedListing.id });

  // Step 5: emit domain event
  if (deps.eventBus) {
    const payload: ListingPublishedPayload = {
      listingId: publishedListing.id,
      agentId: input.agentId,
      serviceId: input.service.id,
      title: publishedListing.title,
    };
    deps.eventBus.publish(makeListingPublishedEvent(payload));
  }

  return ok({
    listingId: publishedListing.id,
    registryId: registryRecord.id,
    status: publishedListing.status,
  });
}
