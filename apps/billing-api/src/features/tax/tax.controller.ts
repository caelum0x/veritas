// Tax controller: validates requests, calls the service, maps results to HTTP responses.

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../http/api-error.js";
import { respondOk, respondCreated } from "../../http/responder.js";
import {
  CalculateTaxBodySchema,
  CreateRegistrationBodySchema,
  CreateExemptionBodySchema,
  OrgJurisdictionQuerySchema,
  CountryQuerySchema,
  ActivateRegistrationParamsSchema,
} from "./tax.schema.js";
import {
  toTaxResultDto,
  toTaxRegistrationDto,
  toExemptionDto,
} from "./tax.mapper.js";
import type { TaxService } from "./tax.service.js";

export class TaxController {
  constructor(private readonly service: TaxService) {}

  calculateTax = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = CalculateTaxBodySchema.safeParse(req.body);
      if (!body.success) {
        throw ApiError.unprocessable("Invalid request body", {
          issues: body.error.issues,
        });
      }

      const result = await this.service.calculateTax(
        body.data.amountBaseUnits,
        body.data.context,
      );

      if (!result.ok) {
        throw ApiError.unprocessable((result.error as Error).message);
      }

      respondOk(res, toTaxResultDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  createRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = CreateRegistrationBodySchema.safeParse(req.body);
      if (!body.success) {
        throw ApiError.unprocessable("Invalid registration data", {
          issues: body.error.issues,
        });
      }

      const result = await this.service.createRegistration(body.data);
      if (!result.ok) {
        throw ApiError.unprocessable((result.error as Error).message);
      }

      respondCreated(res, toTaxRegistrationDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  getRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { registrationId } = ActivateRegistrationParamsSchema.parse(
        req.params,
      );
      const result = await this.service.getRegistrationById(registrationId);

      if (!result.ok) {
        throw ApiError.notFound("TaxRegistration", registrationId);
      }

      respondOk(res, toTaxRegistrationDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  listRegistrations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = OrgJurisdictionQuerySchema.safeParse(req.query);
      if (!query.success) {
        throw ApiError.unprocessable("Missing organizationId query param", {
          issues: query.error.issues,
        });
      }

      const registrations = await this.service.listRegistrations(
        query.data.organizationId,
      );
      respondOk(res, registrations.map(toTaxRegistrationDto));
    } catch (e) {
      next(e);
    }
  };

  activateRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { registrationId } = ActivateRegistrationParamsSchema.parse(
        req.params,
      );
      const result = await this.service.activateRegistration(registrationId);

      if (!result.ok) {
        throw ApiError.notFound("TaxRegistration", registrationId);
      }

      respondOk(res, toTaxRegistrationDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  suspendRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { registrationId } = ActivateRegistrationParamsSchema.parse(
        req.params,
      );
      const result = await this.service.suspendRegistration(registrationId);

      if (!result.ok) {
        throw ApiError.notFound("TaxRegistration", registrationId);
      }

      respondOk(res, toTaxRegistrationDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  createExemption = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = CreateExemptionBodySchema.safeParse(req.body);
      if (!body.success) {
        throw ApiError.unprocessable("Invalid exemption data", {
          issues: body.error.issues,
        });
      }

      const result = await this.service.createExemption(body.data);
      if (!result.ok) {
        throw ApiError.unprocessable((result.error as Error).message);
      }

      respondCreated(res, toExemptionDto(result.value));
    } catch (e) {
      next(e);
    }
  };

  listExemptions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = OrgJurisdictionQuerySchema.safeParse(req.query);
      if (!query.success) {
        throw ApiError.unprocessable("Missing organizationId query param", {
          issues: query.error.issues,
        });
      }

      const exemptions = await this.service.listExemptions(
        query.data.organizationId,
      );
      respondOk(res, exemptions.map(toExemptionDto));
    } catch (e) {
      next(e);
    }
  };

  resolveExemption = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = OrgJurisdictionQuerySchema.safeParse(req.query);
      if (
        !query.success ||
        !query.data.organizationId ||
        !query.data.jurisdictionCode
      ) {
        throw ApiError.unprocessable(
          "organizationId and jurisdictionCode query params are required",
        );
      }

      const result = await this.service.resolveActiveExemption(
        query.data.organizationId,
        query.data.jurisdictionCode,
      );

      if (!result.ok) {
        throw ApiError.unprocessable((result.error as Error).message);
      }

      respondOk(res, result.value ? toExemptionDto(result.value) : null);
    } catch (e) {
      next(e);
    }
  };

  getRates = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = CountryQuerySchema.safeParse(req.query);
      if (!query.success) {
        throw ApiError.unprocessable("Invalid query parameters");
      }

      const rates = this.service.getRates(query.data.country);
      respondOk(res, rates);
    } catch (e) {
      next(e);
    }
  };
}
