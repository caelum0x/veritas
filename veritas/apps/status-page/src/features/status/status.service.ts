// Status feature service — delegates to StatusService, SLO repository, and health checks.
import { isOk, isErr, type Result, ok, err } from "@veritas/core";
import type { HealthSnapshot } from "@veritas/health-aggregation";
import type { SloSummary, Slo } from "@veritas/slo";
import type { Logger } from "@veritas/observability";
import type { StatusService } from "../../status-service.js";
import type { SloRepository } from "@veritas/slo";
import type { StatusPagePayload } from "../../render.js";

export interface StatusServiceDeps {
  readonly statusService: StatusService;
  readonly sloRepository: SloRepository;
  readonly logger: Logger;
}

/** Aggregate status-page snapshot via the existing StatusService. */
export async function getStatusPage(
  deps: StatusServiceDeps,
): Promise<Result<StatusPagePayload>> {
  try {
    const payload = await deps.statusService.getStatus();
    return ok(payload);
  } catch (cause) {
    deps.logger.error("Failed to compute status page", { error: String(cause) });
    return err(new Error(`Status page computation failed: ${String(cause)}`));
  }
}

/** List all SLOs from the SLO repository. */
export async function listSlos(
  deps: StatusServiceDeps,
): Promise<Result<readonly Slo[]>> {
  try {
    const slos = await deps.sloRepository.findAll();
    return ok(slos);
  } catch (cause) {
    deps.logger.error("Failed to list SLOs", { error: String(cause) });
    return err(new Error(`Failed to list SLOs: ${String(cause)}`));
  }
}

/** Fetch a single SLO by id. */
export async function getSlo(
  deps: StatusServiceDeps,
  id: string,
): Promise<Result<Slo>> {
  const result = await deps.sloRepository.findById(id);
  if (isErr(result)) {
    deps.logger.warn("SLO not found", { sloId: id });
    return result;
  }
  return result;
}

/** List recent evaluation results for an SLO. */
export async function getSloEvaluations(
  deps: StatusServiceDeps,
  sloId: string,
  limit: number,
): Promise<Result<readonly import("@veritas/slo").SloEvaluationResult[]>> {
  const sloResult = await deps.sloRepository.findById(sloId);
  if (isErr(sloResult)) return sloResult;

  // evaluations are exposed via container — cast deps to access optional store
  const extDeps = deps as StatusServiceDeps & {
    sloEvaluationRepository?: import("@veritas/slo").SloEvaluationRepository;
  };
  if (extDeps.sloEvaluationRepository) {
    const evals = await extDeps.sloEvaluationRepository.findBySloId(sloId, limit);
    return ok(evals);
  }
  return ok([]);
}
