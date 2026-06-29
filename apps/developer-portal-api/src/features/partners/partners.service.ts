// Partners service — orchestrates partner CRUD, agreements, contacts, and onboarding via PartnerService
import type { Result } from "@veritas/core";
import { isErr } from "@veritas/core";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
import {
  PartnerService,
  type Partner,
  type CreatePartner,
  type UpdatePartner,
  type PartnerAgreement,
  type CreatePartnerAgreement,
  type SignAgreement,
  type TerminateAgreement,
  type PartnerContact,
  type CreatePartnerContact,
  type UpdatePartnerContact,
  type PartnerOnboarding,
  type OnboardingStep,
} from "@veritas/partner";
import type { Logger } from "@veritas/observability";

export interface PartnerDeps {
  readonly partnerService: PartnerService;
  readonly logger: Logger;
}

export class PartnersService {
  private readonly svc: PartnerService;
  private readonly logger: Logger;

  constructor(deps: PartnerDeps) {
    this.svc = deps.partnerService;
    this.logger = deps.logger;
  }

  private now(): string {
    return new Date().toISOString();
  }

  // ---------------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------------

  async createPartner(input: CreatePartner): Promise<Result<Partner>> {
    const result = await this.svc.createPartner(input, this.now());
    if (isErr(result)) this.logger.warn("createPartner failed", { error: errorMessage(result.error) });
    return result;
  }

  async getPartner(id: string): Promise<Result<Partner>> {
    return this.svc.getPartner(id);
  }

  async getPartnerBySlug(slug: string): Promise<Result<Partner>> {
    return this.svc.getPartnerBySlug(slug);
  }

  async listPartners(): Promise<Result<readonly Partner[]>> {
    return this.svc.listPartners();
  }

  async updatePartner(id: string, update: UpdatePartner): Promise<Result<Partner>> {
    const result = await this.svc.updatePartner(id, update, this.now());
    if (isErr(result)) this.logger.warn("updatePartner failed", { id, error: errorMessage(result.error) });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Agreements
  // ---------------------------------------------------------------------------

  async createAgreement(input: CreatePartnerAgreement): Promise<Result<PartnerAgreement>> {
    return this.svc.createAgreement(input, this.now());
  }

  async listPartnerAgreements(partnerId: string): Promise<Result<readonly PartnerAgreement[]>> {
    return this.svc.listPartnerAgreements(partnerId);
  }

  async signAgreement(id: string, input: SignAgreement): Promise<Result<PartnerAgreement>> {
    return this.svc.signPartnerAgreement(id, input, this.now());
  }

  async terminateAgreement(id: string, input: TerminateAgreement): Promise<Result<PartnerAgreement>> {
    return this.svc.terminatePartnerAgreement(id, input, this.now());
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  async addContact(input: CreatePartnerContact): Promise<Result<PartnerContact>> {
    return this.svc.addContact(input, this.now());
  }

  async updateContact(id: string, update: UpdatePartnerContact): Promise<Result<PartnerContact>> {
    return this.svc.updateContact(id, update, this.now());
  }

  async removeContact(id: string): Promise<Result<void>> {
    return this.svc.removeContact(id);
  }

  async listContacts(partnerId: string): Promise<Result<readonly PartnerContact[]>> {
    return this.svc.listPartnerContacts(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async startOnboarding(partnerId: string): Promise<Result<PartnerOnboarding>> {
    return this.svc.startOnboarding(partnerId, this.now());
  }

  async advanceOnboardingStep(
    onboardingId: string,
    step: OnboardingStep,
    notes?: string,
  ): Promise<Result<PartnerOnboarding>> {
    return this.svc.advanceStep(onboardingId, step, this.now(), notes);
  }

  async abandonOnboarding(onboardingId: string): Promise<Result<PartnerOnboarding>> {
    return this.svc.abandonPartnerOnboarding(onboardingId, this.now());
  }
}
