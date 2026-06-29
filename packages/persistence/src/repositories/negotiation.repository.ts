// NegotiationRepository interface defining persistence operations for CAP price negotiations.
import type { Result, Page } from "@veritas/core";
import type {
  Negotiation,
  CreateNegotiation,
  UpdateNegotiation,
  NegotiationStatus,
} from "@veritas/contracts";
import type { BaseRepository } from "../base-repository.js";
import type { QueryOptions } from "../query.js";

/** Extended repository interface for Negotiation entities with status/agent/service queries. */
export interface NegotiationRepository
  extends BaseRepository<Negotiation, CreateNegotiation, UpdateNegotiation> {
  /** Find a single negotiation by its opaque ID. */
  findById(id: string): Promise<Result<Negotiation>>;

  /** List negotiations with optional filtering, sorting, and cursor pagination. */
  list(options?: QueryOptions<Negotiation>): Promise<Result<Page<Negotiation>>>;

  /** Create a new negotiation from a CreateNegotiation DTO. */
  create(dto: CreateNegotiation): Promise<Result<Negotiation>>;

  /** Update the status of an existing negotiation. */
  update(id: string, dto: UpdateNegotiation): Promise<Result<Negotiation>>;

  /** Delete a negotiation by ID, returning the deleted entity. */
  delete(id: string): Promise<Result<Negotiation>>;

  /** Retrieve all negotiations for a given buyer agent. */
  findByBuyerAgentId(
    buyerAgentId: string,
    options?: QueryOptions<Negotiation>
  ): Promise<Result<Page<Negotiation>>>;

  /** Retrieve all negotiations for a given service. */
  findByServiceId(
    serviceId: string,
    options?: QueryOptions<Negotiation>
  ): Promise<Result<Page<Negotiation>>>;

  /** Retrieve all negotiations in a particular status. */
  findByStatus(
    status: NegotiationStatus,
    options?: QueryOptions<Negotiation>
  ): Promise<Result<Page<Negotiation>>>;

  /** Expire all QUOTED negotiations whose expiresAt is before the given ISO timestamp. */
  expireQuoted(beforeIso: string): Promise<Result<number>>;
}
