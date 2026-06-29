// ServiceRepository interface for CAP service catalog persistence.

import type { Result, Page } from "@veritas/core";
import type { Service, CreateService, UpdateService } from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Repository interface for Service entities. */
export interface ServiceRepository extends BaseRepository<Service, CreateService, UpdateService> {
  /** Find a service by its unique slug. */
  findBySlug(slug: string): Promise<Result<Service>>;

  /** List only active services with optional query options. */
  findActive(options?: QueryOptions<Service>): Promise<Result<Page<Service>>>;
}
