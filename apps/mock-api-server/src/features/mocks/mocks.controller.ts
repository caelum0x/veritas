// HTTP controller: validates requests, calls MocksService, serialises responses.
import type { Request, Response, NextFunction } from "express";
import {
  MockNotFoundError,
  MockAlreadyExistsError,
  MockValidationError,
  ScenarioNotFoundError,
} from "@veritas/mock-server";
import {
  CreateMockBodySchema,
  UpdateMockBodySchema,
  CreateScenarioBodySchema,
  ResolveRequestBodySchema,
  MockIdParamSchema,
  ScenarioIdParamSchema,
} from "./mocks.schema.js";
import { mockToDto, scenarioToDto } from "./mocks.mapper.js";
import type { MocksService } from "./mocks.service.js";
import {
  makeApiError,
  makeValidationError,
  makeNotFoundError,
  makeConflictError,
  makeInternalError,
} from "../../http/api-error.js";

function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof MockNotFoundError || err instanceof ScenarioNotFoundError) {
    res.status(404).json(makeNotFoundError((err as Error).message));
    return;
  }
  if (err instanceof MockAlreadyExistsError) {
    res.status(409).json(makeConflictError((err as Error).message));
    return;
  }
  if (err instanceof MockValidationError) {
    res.status(422).json(makeApiError("VALIDATION_ERROR", (err as Error).message));
    return;
  }
  res.status(500).json(makeInternalError());
}

export function buildMocksController(service: MocksService) {
  return {
    createMock(req: Request, res: Response, next: NextFunction): void {
      const parsed = CreateMockBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid request body", parsed.error.issues));
        return;
      }
      try {
        const mock = service.createMock(parsed.data);
        res.status(201).json({ success: true, data: mockToDto(mock) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    getMock(req: Request, res: Response): void {
      const parsed = MockIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid mock id"));
        return;
      }
      try {
        const mock = service.getMock(parsed.data.mockId);
        res.status(200).json({ success: true, data: mockToDto(mock) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    listMocks(_req: Request, res: Response): void {
      const mocks = service.listMocks();
      res.status(200).json({ success: true, data: mocks.map(mockToDto), meta: { total: mocks.length } });
    },

    updateMock(req: Request, res: Response): void {
      const paramParsed = MockIdParamSchema.safeParse(req.params);
      if (!paramParsed.success) {
        res.status(400).json(makeValidationError("Invalid mock id"));
        return;
      }
      const bodyParsed = UpdateMockBodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        res.status(400).json(makeValidationError("Invalid request body", bodyParsed.error.issues));
        return;
      }
      try {
        const mock = service.updateMock(paramParsed.data.mockId, bodyParsed.data);
        res.status(200).json({ success: true, data: mockToDto(mock) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    deleteMock(req: Request, res: Response): void {
      const parsed = MockIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid mock id"));
        return;
      }
      try {
        service.deleteMock(parsed.data.mockId);
        res.status(204).send();
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    resetCounts(_req: Request, res: Response): void {
      service.resetCounts();
      res.status(200).json({ success: true, data: null });
    },

    async resolveRequest(req: Request, res: Response): Promise<void> {
      const parsed = ResolveRequestBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid resolve request body", parsed.error.issues));
        return;
      }
      try {
        const result = await service.resolveRequest({
          method: parsed.data.method,
          path: parsed.data.path,
          query: parsed.data.query,
          headers: parsed.data.headers,
          body: parsed.data.body,
        });
        if (result.kind === "no-match") {
          res.status(404).json(makeNotFoundError("No mock matched the request"));
          return;
        }
        res.status(200).json({ success: true, data: { kind: result.kind, mockId: result.mockId, response: result.response } });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    createScenario(req: Request, res: Response): void {
      const parsed = CreateScenarioBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid scenario body", parsed.error.issues));
        return;
      }
      try {
        const scenario = service.createScenario(parsed.data);
        res.status(201).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    getScenario(req: Request, res: Response): void {
      const parsed = ScenarioIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid scenario id"));
        return;
      }
      try {
        const scenario = service.getScenario(parsed.data.scenarioId);
        res.status(200).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    listScenarios(_req: Request, res: Response): void {
      const scenarios = service.listScenarios();
      res.status(200).json({ success: true, data: scenarios.map(scenarioToDto), meta: { total: scenarios.length } });
    },

    activateScenario(req: Request, res: Response): void {
      const parsed = ScenarioIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid scenario id"));
        return;
      }
      try {
        const scenario = service.activateScenario(parsed.data.scenarioId);
        res.status(200).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    deactivateScenario(req: Request, res: Response): void {
      const parsed = ScenarioIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json(makeValidationError("Invalid scenario id"));
        return;
      }
      try {
        const scenario = service.deactivateScenario(parsed.data.scenarioId);
        res.status(200).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    addMockToScenario(req: Request, res: Response): void {
      const sParsed = ScenarioIdParamSchema.safeParse(req.params);
      const mParsed = MockIdParamSchema.safeParse(req.params);
      if (!sParsed.success || !mParsed.success) {
        res.status(400).json(makeValidationError("Invalid params"));
        return;
      }
      try {
        const scenario = service.addMockToScenario(sParsed.data.scenarioId, mParsed.data.mockId);
        res.status(200).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },

    removeMockFromScenario(req: Request, res: Response): void {
      const sParsed = ScenarioIdParamSchema.safeParse(req.params);
      const mParsed = MockIdParamSchema.safeParse(req.params);
      if (!sParsed.success || !mParsed.success) {
        res.status(400).json(makeValidationError("Invalid params"));
        return;
      }
      try {
        const scenario = service.removeMockFromScenario(sParsed.data.scenarioId, mParsed.data.mockId);
        res.status(200).json({ success: true, data: scenarioToDto(scenario) });
      } catch (err) {
        handleServiceError(err, res);
      }
    },
  };
}
