// schema-conformance gate: validates the report object matches the Report contract schema.

import { z } from "zod";
import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import { ReportSchema } from "@veritas/contracts";
import type { QualityGate, GateInput } from "../gate.js";
import type { GateResult } from "../result.js";
import { passed, failed } from "../result.js";
import type { Severity } from "../severity.js";

export interface SchemaConformanceOptions {
  readonly failOn?: Severity;
}

/** QualityGate that validates the report conforms to the canonical Report schema. */
export class SchemaConformanceGate implements QualityGate {
  readonly id = "schema-conformance";
  readonly name = "Schema Conformance";
  readonly failOn: Severity;

  constructor(options: SchemaConformanceOptions = {}) {
    this.failOn = options.failOn ?? "critical";
  }

  async evaluate(input: GateInput): Promise<Result<GateResult>> {
    const parseResult = ReportSchema.safeParse(input.report);

    if (parseResult.success) {
      return ok(passed(this.id));
    }

    const findings = parseResult.error.issues.map((issue) => ({
      code: "SCHEMA_VIOLATION",
      message: issue.message,
      severity: this.failOn,
      path: issue.path.join("."),
    }));

    return ok(failed(this.id, findings));
  }
}

/** Default singleton instance requiring critical-level compliance. */
export const schemaConformanceGate = new SchemaConformanceGate();
