// Transform steps — composable pure transformations implementing the TransformStep port.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { TransformError } from "./errors.js";
import type { TransformStep, TransformContext, RawRecord, TransformedRecord } from "./types.js";

export class RenameFieldsStep implements TransformStep {
  readonly name = "rename-fields";
  private readonly mapping: Readonly<Record<string, string>>;

  constructor(mapping: Record<string, string>) {
    this.mapping = Object.freeze({ ...mapping });
  }

  transform(
    record: RawRecord,
    _ctx: TransformContext,
  ): Result<TransformedRecord, TransformError> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record.fields)) {
      const newKey = this.mapping[key] ?? key;
      next[newKey] = value;
    }
    return ok(makeTransformed(record, Object.freeze(next)));
  }
}

export class DropFieldsStep implements TransformStep {
  readonly name = "drop-fields";
  private readonly keySet: ReadonlySet<string>;

  constructor(keys: ReadonlyArray<string>) {
    this.keySet = new Set(keys);
  }

  transform(
    record: RawRecord,
    _ctx: TransformContext,
  ): Result<TransformedRecord, TransformError> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record.fields)) {
      if (!this.keySet.has(key)) next[key] = value;
    }
    return ok(makeTransformed(record, Object.freeze(next)));
  }
}

export class AddConstantsStep implements TransformStep {
  readonly name = "add-constants";
  private readonly constants: Readonly<Record<string, unknown>>;

  constructor(constants: Record<string, unknown>) {
    this.constants = Object.freeze({ ...constants });
  }

  transform(
    record: RawRecord,
    _ctx: TransformContext,
  ): Result<TransformedRecord, TransformError> {
    return ok(makeTransformed(record, Object.freeze({ ...record.fields, ...this.constants })));
  }
}

export class CastStringStep implements TransformStep {
  readonly name = "cast-string";
  private readonly keys: ReadonlyArray<string>;

  constructor(keys: ReadonlyArray<string>) {
    this.keys = [...keys];
  }

  transform(
    record: RawRecord,
    _ctx: TransformContext,
  ): Result<TransformedRecord, TransformError> {
    const next: Record<string, unknown> = { ...record.fields };
    for (const key of this.keys) {
      if (key in next) next[key] = String(next[key]);
    }
    return ok(makeTransformed(record, Object.freeze(next)));
  }
}

export class ChainTransformStep implements TransformStep {
  readonly name: string;
  private readonly steps: ReadonlyArray<TransformStep>;

  constructor(steps: ReadonlyArray<TransformStep>) {
    this.steps = steps;
    this.name = `chain(${steps.map((s) => s.name).join(",")})`;
  }

  transform(record: RawRecord, ctx: TransformContext): Result<TransformedRecord, TransformError> {
    let current: RawRecord = record;
    for (const step of this.steps) {
      const result = step.transform(current, ctx);
      if (!result.ok) return result;
      current = result.value;
    }
    return ok(current as TransformedRecord);
  }
}

function makeTransformed(
  source: RawRecord,
  fields: Readonly<Record<string, unknown>>,
): TransformedRecord {
  return Object.freeze({
    id: source.id,
    fields,
    meta: source.meta,
    sourceId: (source as Partial<TransformedRecord>).sourceId ?? "",
    extractedAt: (source as Partial<TransformedRecord>).extractedAt ?? new Date().toISOString(),
    transformedAt: new Date().toISOString(),
  });
}

export function renameFields(mapping: Record<string, string>): RenameFieldsStep {
  return new RenameFieldsStep(mapping);
}

export function dropFields(keys: ReadonlyArray<string>): DropFieldsStep {
  return new DropFieldsStep(keys);
}

export function addConstants(constants: Record<string, unknown>): AddConstantsStep {
  return new AddConstantsStep(constants);
}

export function castString(keys: ReadonlyArray<string>): CastStringStep {
  return new CastStringStep(keys);
}

export function chain(steps: ReadonlyArray<TransformStep>): ChainTransformStep {
  return new ChainTransformStep(steps);
}
