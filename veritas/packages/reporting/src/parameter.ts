// Report parameter definitions — typed inputs that parameterise report execution.
import { z } from "zod";

export const ParameterTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "date_range",
  "enum",
  "multi_enum",
]);
export type ParameterType = z.infer<typeof ParameterTypeSchema>;

export const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const ParameterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  DateRangeSchema,
  z.array(z.string()),
]);
export type ParameterValue = z.infer<typeof ParameterValueSchema>;

export const EnumChoiceSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});
export type EnumChoice = z.infer<typeof EnumChoiceSchema>;

export const ParameterDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: ParameterTypeSchema,
  required: z.boolean().default(false),
  defaultValue: ParameterValueSchema.optional(),
  choices: z.array(EnumChoiceSchema).optional(),
  description: z.string().optional(),
});
export type ParameterDef = z.infer<typeof ParameterDefSchema>;

export const ReportParametersSchema = z.record(z.string(), ParameterValueSchema);
export type ReportParameters = z.infer<typeof ReportParametersSchema>;

/**
 * Validate a map of runtime values against a list of parameter definitions.
 * Returns a new object with defaults applied for missing optional params.
 */
export function resolveParameters(
  defs: ReadonlyArray<ParameterDef>,
  supplied: ReportParameters,
): { resolved: ReportParameters; errors: string[] } {
  const errors: string[] = [];
  const resolved: ReportParameters = {};

  for (const def of defs) {
    const raw = supplied[def.id];
    if (raw === undefined || raw === null) {
      if (def.required) {
        errors.push(`Required parameter "${def.id}" is missing.`);
      } else if (def.defaultValue !== undefined) {
        resolved[def.id] = def.defaultValue;
      }
    } else {
      const parsed = ParameterValueSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(`Parameter "${def.id}" has invalid value.`);
      } else {
        resolved[def.id] = parsed.data;
      }
    }
  }

  return { resolved, errors };
}

/** Interpolate a template string with parameter values (e.g. "{{from}} to {{to}}"). */
export function interpolate(template: string, params: ReportParameters): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    if (val === undefined) return `{{${key}}}`;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}
