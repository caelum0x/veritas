// Control registry: in-memory store and lookup service for SOC2 controls.

import { type Result, ok, err, asIsoTimestamp } from "@veritas/core";
import {
  type Control,
  type CreateControl,
  type UpdateControl,
  type ControlSummary,
  type TrustServiceCategory,
  ControlSchema,
  toControlSummary,
  isActiveControl,
} from "./control.js";

/** Port interface for persistent control storage. */
export interface ControlRepository {
  findAll(): Promise<Result<Control[]>>;
  findById(id: string): Promise<Result<Control | null>>;
  findByCode(code: string): Promise<Result<Control | null>>;
  save(control: Control): Promise<Result<Control>>;
  delete(id: string): Promise<Result<void>>;
}

/** In-memory implementation of ControlRepository for testing / local use. */
export class InMemoryControlRepository implements ControlRepository {
  private readonly store = new Map<string, Control>();

  async findAll(): Promise<Result<Control[]>> {
    return ok([...this.store.values()]);
  }

  async findById(id: string): Promise<Result<Control | null>> {
    return ok(this.store.get(id) ?? null);
  }

  async findByCode(code: string): Promise<Result<Control | null>> {
    const found =
      [...this.store.values()].find((c) => c.code === code) ?? null;
    return ok(found);
  }

  async save(control: Control): Promise<Result<Control>> {
    const frozen = Object.freeze({ ...control });
    this.store.set(frozen.id, frozen);
    return ok(frozen);
  }

  async delete(id: string): Promise<Result<void>> {
    this.store.delete(id);
    return ok(undefined);
  }
}

/** ControlRegistry wraps a repository with domain logic for control lifecycle management. */
export class ControlRegistry {
  constructor(
    private readonly repo: ControlRepository,
    private readonly generateId: () => string,
    private readonly now: () => string,
  ) {}

  async create(input: CreateControl): Promise<Result<Control>> {
    const existingResult = await this.repo.findByCode(input.code);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value !== null) {
      return err(`Control with code "${input.code}" already exists`);
    }

    const ts = this.now();
    const parsed = ControlSchema.safeParse({
      ...input,
      id: this.generateId(),
      createdAt: ts,
      updatedAt: ts,
    });
    if (!parsed.success) {
      return err(`Validation failed: ${parsed.error.message}`);
    }
    return this.repo.save(parsed.data);
  }

  async update(
    id: string,
    patch: UpdateControl,
  ): Promise<Result<Control>> {
    const findResult = await this.repo.findById(id);
    if (!findResult.ok) return findResult;
    if (findResult.value === null) {
      return err(`Control "${id}" not found`);
    }
    const updated: Control = {
      ...findResult.value,
      ...patch,
      id,
      updatedAt: asIsoTimestamp(this.now()),
    };
    return this.repo.save(updated);
  }

  async getById(id: string): Promise<Result<Control | null>> {
    return this.repo.findById(id);
  }

  async getByCode(code: string): Promise<Result<Control | null>> {
    return this.repo.findByCode(code);
  }

  async listAll(): Promise<Result<Control[]>> {
    return this.repo.findAll();
  }

  async listActive(): Promise<Result<Control[]>> {
    const all = await this.repo.findAll();
    if (!all.ok) return all;
    return ok(all.value.filter(isActiveControl));
  }

  async listByCategory(
    category: TrustServiceCategory,
  ): Promise<Result<Control[]>> {
    const all = await this.repo.findAll();
    if (!all.ok) return all;
    return ok(all.value.filter((c) => c.category === category));
  }

  async listSummaries(): Promise<Result<ControlSummary[]>> {
    const all = await this.repo.findAll();
    if (!all.ok) return all;
    return ok(all.value.map(toControlSummary));
  }

  async remove(id: string): Promise<Result<void>> {
    const findResult = await this.repo.findById(id);
    if (!findResult.ok) return findResult;
    if (findResult.value === null) {
      return err(`Control "${id}" not found`);
    }
    return this.repo.delete(id);
  }

  async countByCategory(): Promise<Result<Record<TrustServiceCategory, number>>> {
    const all = await this.repo.findAll();
    if (!all.ok) return all;
    const counts: Record<TrustServiceCategory, number> = {
      security: 0,
      availability: 0,
      processing_integrity: 0,
      confidentiality: 0,
      privacy: 0,
    };
    for (const control of all.value) {
      counts[control.category]++;
    }
    return ok(counts);
  }
}
