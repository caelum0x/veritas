// Partners controller — validates requests, delegates to PartnersService, maps results to HTTP responses
import type { Request, Response, NextFunction } from "express";
import { isErr } from "@veritas/core";
import {
  CreatePartnerBodySchema,
  UpdatePartnerBodySchema,
  CreateAgreementBodySchema,
  SignAgreementBodySchema,
  TerminateAgreementBodySchema,
  CreateContactBodySchema,
  UpdateContactBodySchema,
} from "./partners.schema.js";
import { mapPartner, mapAgreement, mapContact, mapOnboarding } from "./partners.mapper.js";
import type { PartnersService } from "./partners.service.js";
import { OnboardingStepSchema } from "@veritas/partner";
import { z } from "zod";

const AdvanceStepBodySchema = z.object({
  step: OnboardingStepSchema,
  notes: z.string().optional(),
});

export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  // ---------------------------------------------------------------------------
  // Partners
  // ---------------------------------------------------------------------------

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = CreatePartnerBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.createPartner(parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: mapPartner(result.value) });
  }

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    const result = await this.service.listPartners();
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: result.value.map(mapPartner) });
  }

  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    const id = req.params["id"];
    if (!id) { next(new Error("Missing partner id")); return; }

    const result = await this.service.getPartner(id);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapPartner(result.value) });
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    const id = req.params["id"];
    if (!id) { next(new Error("Missing partner id")); return; }

    const parsed = UpdatePartnerBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.updatePartner(id, parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapPartner(result.value) });
  }

  // ---------------------------------------------------------------------------
  // Agreements
  // ---------------------------------------------------------------------------

  async createAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = CreateAgreementBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.createAgreement(parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: mapAgreement(result.value) });
  }

  async listAgreements(req: Request, res: Response, next: NextFunction): Promise<void> {
    const partnerId = req.params["id"];
    if (!partnerId) { next(new Error("Missing partner id")); return; }

    const result = await this.service.listPartnerAgreements(partnerId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: result.value.map(mapAgreement) });
  }

  async signAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    const agreementId = req.params["agreementId"];
    if (!agreementId) { next(new Error("Missing agreement id")); return; }

    const parsed = SignAgreementBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.signAgreement(agreementId, parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapAgreement(result.value) });
  }

  async terminateAgreement(req: Request, res: Response, next: NextFunction): Promise<void> {
    const agreementId = req.params["agreementId"];
    if (!agreementId) { next(new Error("Missing agreement id")); return; }

    const parsed = TerminateAgreementBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.terminateAgreement(agreementId, parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapAgreement(result.value) });
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  async addContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = CreateContactBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.addContact(parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: mapContact(result.value) });
  }

  async listContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    const partnerId = req.params["id"];
    if (!partnerId) { next(new Error("Missing partner id")); return; }

    const result = await this.service.listContacts(partnerId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: result.value.map(mapContact) });
  }

  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    const contactId = req.params["contactId"];
    if (!contactId) { next(new Error("Missing contact id")); return; }

    const parsed = UpdateContactBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.updateContact(contactId, parsed.data);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapContact(result.value) });
  }

  async removeContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    const contactId = req.params["contactId"];
    if (!contactId) { next(new Error("Missing contact id")); return; }

    const result = await this.service.removeContact(contactId);
    if (isErr(result)) { next(result.error); return; }
    res.status(204).send();
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async startOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    const partnerId = req.params["id"];
    if (!partnerId) { next(new Error("Missing partner id")); return; }

    const result = await this.service.startOnboarding(partnerId);
    if (isErr(result)) { next(result.error); return; }
    res.status(201).json({ success: true, data: mapOnboarding(result.value) });
  }

  async advanceOnboardingStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    const onboardingId = req.params["onboardingId"];
    if (!onboardingId) { next(new Error("Missing onboarding id")); return; }

    const parsed = AdvanceStepBodySchema.safeParse(req.body);
    if (!parsed.success) { next(new Error(parsed.error.message)); return; }

    const result = await this.service.advanceOnboardingStep(onboardingId, parsed.data.step, parsed.data.notes);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapOnboarding(result.value) });
  }

  async abandonOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    const onboardingId = req.params["onboardingId"];
    if (!onboardingId) { next(new Error("Missing onboarding id")); return; }

    const result = await this.service.abandonOnboarding(onboardingId);
    if (isErr(result)) { next(result.error); return; }
    res.status(200).json({ success: true, data: mapOnboarding(result.value) });
  }
}
