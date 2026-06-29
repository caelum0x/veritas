// Tax service: orchestrates tax calculation, registrations, exemptions, and VAT rate lookups.

import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import {
  createRegistration,
  activateRegistration,
  suspendRegistration,
  getRegistration,
  validateTaxNumberFormat,
  createExemption,
  resolveExemption,
  isSupportedExemptionType,
  getAllRates,
  getRatesForCountry,
  type TaxRegistration,
  type CreateRegistrationInput,
  type Exemption,
  type CreateExemptionInput,
  type TaxResult,
  type TaxContext,
  type RegistrationRepository,
  type ExemptionRepository,
} from "@veritas/tax";
import type { Deps } from "../../container.js";

export interface InMemoryRegistrationRepository extends RegistrationRepository {
  _registrations: Map<string, TaxRegistration>;
}

export interface InMemoryExemptionRepository extends ExemptionRepository {
  _exemptions: Map<string, Exemption>;
}

function buildRegistrationRepository(): InMemoryRegistrationRepository {
  const store = new Map<string, TaxRegistration>();
  const byOrg = new Map<string, Set<string>>();

  function ensureOrgSet(orgId: string): Set<string> {
    if (!byOrg.has(orgId)) byOrg.set(orgId, new Set());
    return byOrg.get(orgId)!;
  }

  return {
    _registrations: store,
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findByOrganization(organizationId) {
      const ids = byOrg.get(organizationId) ?? new Set<string>();
      return Array.from(ids)
        .map((id) => store.get(id))
        .filter((r): r is TaxRegistration => r != null);
    },
    async findByJurisdiction(organizationId, jurisdictionCode) {
      const ids = byOrg.get(organizationId) ?? new Set<string>();
      return Array.from(ids)
        .map((id) => store.get(id))
        .filter(
          (r): r is TaxRegistration =>
            r != null && r.jurisdictionCode === jurisdictionCode,
        );
    },
    async save(registration) {
      store.set(registration.id, registration);
      ensureOrgSet(registration.organizationId).add(registration.id);
    },
    async delete(id) {
      const reg = store.get(id);
      if (reg) {
        byOrg.get(reg.organizationId)?.delete(id);
        store.delete(id);
      }
    },
  };
}

function buildExemptionRepository(): InMemoryExemptionRepository {
  const store = new Map<string, Exemption>();
  const byOrg = new Map<string, Set<string>>();

  function ensureOrgSet(orgId: string): Set<string> {
    if (!byOrg.has(orgId)) byOrg.set(orgId, new Set());
    return byOrg.get(orgId)!;
  }

  return {
    _exemptions: store,
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findByOrganization(organizationId) {
      const ids = byOrg.get(organizationId) ?? new Set<string>();
      return Array.from(ids)
        .map((id) => store.get(id))
        .filter((e): e is Exemption => e != null);
    },
    async findActive(organizationId, jurisdictionCode) {
      const ids = byOrg.get(organizationId) ?? new Set<string>();
      return Array.from(ids)
        .map((id) => store.get(id))
        .filter(
          (e): e is Exemption =>
            e != null && e.jurisdictionCode === jurisdictionCode,
        );
    },
    async save(exemption) {
      store.set(exemption.id, exemption);
      ensureOrgSet(exemption.organizationId).add(exemption.id);
    },
    async delete(id) {
      const ex = store.get(id);
      if (ex) {
        byOrg.get(ex.organizationId)?.delete(id);
        store.delete(id);
      }
    },
  };
}

export interface TaxServiceDeps {
  readonly deps: Deps;
  readonly registrationRepo: RegistrationRepository;
  readonly exemptionRepo: ExemptionRepository;
}

export class TaxService {
  private readonly registrationRepo: RegistrationRepository;
  private readonly exemptionRepo: ExemptionRepository;
  private readonly deps: Deps;

  constructor({ deps, registrationRepo, exemptionRepo }: TaxServiceDeps) {
    this.deps = deps;
    this.registrationRepo = registrationRepo;
    this.exemptionRepo = exemptionRepo;
  }

  async calculateTax(
    amountBaseUnits: bigint,
    ctx: TaxContext,
  ): Promise<Result<TaxResult>> {
    const log = this.deps.logger;
    log.info("tax.calculate.start", {
      amountBaseUnits: amountBaseUnits.toString(),
      buyerCountry: ctx.buyerCountry,
      sellerCountry: ctx.sellerCountry,
      category: ctx.category,
    });

    const result = await this.deps.taxCalculator.calculate(amountBaseUnits, ctx);

    if (!result.ok) {
      log.error("tax.calculate.failed", { error: (result.error as Error).message });
    } else {
      log.info("tax.calculate.complete", {
        effectiveRate: result.value.effectiveRate,
        totalTax: result.value.totalTaxBaseUnits.toString(),
      });
    }

    return result;
  }

  async createRegistration(
    input: CreateRegistrationInput,
  ): Promise<Result<TaxRegistration>> {
    const formatCheck = validateTaxNumberFormat(
      input.taxNumber,
      input.jurisdictionCode,
    );
    if (!formatCheck.ok) {
      return err(formatCheck.error);
    }

    const registration = createRegistration(input);
    await this.registrationRepo.save(registration);

    this.deps.logger.info("tax.registration.created", {
      id: registration.id,
      org: registration.organizationId,
      jurisdiction: registration.jurisdictionCode,
    });

    return ok(registration);
  }

  async getRegistrationById(
    id: string,
  ): Promise<Result<TaxRegistration>> {
    return getRegistration(this.registrationRepo, id);
  }

  async listRegistrations(
    organizationId: string,
  ): Promise<readonly TaxRegistration[]> {
    return this.registrationRepo.findByOrganization(organizationId);
  }

  async activateRegistration(
    id: string,
  ): Promise<Result<TaxRegistration>> {
    const found = await getRegistration(this.registrationRepo, id);
    if (!found.ok) return found;

    const updated = activateRegistration(found.value);
    await this.registrationRepo.save(updated);

    this.deps.logger.info("tax.registration.activated", { id });
    return ok(updated);
  }

  async suspendRegistration(
    id: string,
  ): Promise<Result<TaxRegistration>> {
    const found = await getRegistration(this.registrationRepo, id);
    if (!found.ok) return found;

    const updated = suspendRegistration(found.value);
    await this.registrationRepo.save(updated);

    this.deps.logger.info("tax.registration.suspended", { id });
    return ok(updated);
  }

  async createExemption(
    input: CreateExemptionInput,
  ): Promise<Result<Exemption>> {
    if (!isSupportedExemptionType(input.type, input.jurisdictionCode)) {
      return err(
        new Error(
          `Exemption type '${input.type}' is not supported for jurisdiction '${input.jurisdictionCode}'`,
        ),
      );
    }

    const exemption = createExemption(input);
    await this.exemptionRepo.save(exemption);

    this.deps.logger.info("tax.exemption.created", {
      id: exemption.id,
      org: exemption.organizationId,
      jurisdiction: exemption.jurisdictionCode,
    });

    return ok(exemption);
  }

  async listExemptions(organizationId: string): Promise<readonly Exemption[]> {
    return this.exemptionRepo.findByOrganization(organizationId);
  }

  async resolveActiveExemption(
    organizationId: string,
    jurisdictionCode: string,
  ): Promise<Result<Exemption | null>> {
    return resolveExemption(
      this.exemptionRepo,
      organizationId,
      jurisdictionCode,
    );
  }

  getRates(country?: string) {
    return country ? getRatesForCountry(country) : getAllRates();
  }
}

// Module-level singletons so repositories survive across requests.
const registrationRepo = buildRegistrationRepository();
const exemptionRepo = buildExemptionRepository();

export function createTaxService(deps: Deps): TaxService {
  return new TaxService({ deps, registrationRepo, exemptionRepo });
}
