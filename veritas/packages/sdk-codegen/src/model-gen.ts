// Generate model/type definitions from ModelDefinition IR for any target language.
import type { ModelDefinition, SchemaProperty, SdkTarget } from "./types.js";
import { emit } from "./emitter.js";
import { toPascalCase, toSnakeCase } from "./naming.js";

// ---------------------------------------------------------------------------
// TypeScript model generation
// ---------------------------------------------------------------------------

function tsPropertyType(prop: SchemaProperty): string {
  if (prop.$ref !== null) return toPascalCase(prop.$ref.split("/").pop() ?? prop.$ref);
  if (prop.enumValues !== null) return prop.enumValues.map((v) => JSON.stringify(v)).join(" | ");
  if (prop.arrayItemType !== null) {
    const inner = prop.arrayItemType.startsWith("#")
      ? toPascalCase(prop.arrayItemType.split("/").pop() ?? prop.arrayItemType)
      : prop.arrayItemType;
    return `ReadonlyArray<${inner}>`;
  }
  switch (prop.type) {
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "Record<string, unknown>";
    default:
      return "string";
  }
}

function emitTsModel(model: ModelDefinition): string {
  return emit((e) => {
    if (model.description) e.line(`/** ${model.description} */`);
    e.open(`export interface ${toPascalCase(model.name)} {`);
    for (const prop of model.properties) {
      const optional = !prop.required || prop.nullable ? "?" : "";
      const nullable = prop.nullable ? " | null" : "";
      const jsType = tsPropertyType(prop);
      if (prop.description) e.line(`/** ${prop.description} */`);
      e.line(`readonly ${prop.name}${optional}: ${jsType}${nullable};`);
    }
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// Python model generation (dataclass descriptor string)
// ---------------------------------------------------------------------------

function pyPropertyType(prop: SchemaProperty): string {
  if (prop.$ref !== null) return toPascalCase(prop.$ref.split("/").pop() ?? prop.$ref);
  if (prop.enumValues !== null) return "str";
  if (prop.arrayItemType !== null) {
    const inner = prop.arrayItemType.startsWith("#")
      ? toPascalCase(prop.arrayItemType.split("/").pop() ?? prop.arrayItemType)
      : prop.arrayItemType;
    return `List[${inner}]`;
  }
  switch (prop.type) {
    case "integer":
      return "int";
    case "number":
      return "float";
    case "boolean":
      return "bool";
    case "object":
      return "Dict[str, Any]";
    default:
      return "str";
  }
}

function emitPyModel(model: ModelDefinition): string {
  return emit((e) => {
    e.line("@dataclass(frozen=True)");
    e.open(`class ${toPascalCase(model.name)}:`);
    if (model.description) {
      e.line(`"""${model.description}"""`);
      e.blank();
    }
    for (const prop of model.properties) {
      const pyName = toSnakeCase(prop.name);
      let pyType = pyPropertyType(prop);
      if (!prop.required || prop.nullable) pyType = `Optional[${pyType}]`;
      const defaultClause = !prop.required || prop.nullable ? " = None" : "";
      e.line(`${pyName}: ${pyType}${defaultClause}`);
    }
    if (model.properties.length === 0) e.line("pass");
    e.close("");
  });
}

// ---------------------------------------------------------------------------
// Go model generation (struct descriptor string)
// ---------------------------------------------------------------------------

function goPropertyType(prop: SchemaProperty): string {
  if (prop.$ref !== null) return toPascalCase(prop.$ref.split("/").pop() ?? prop.$ref);
  if (prop.enumValues !== null) return "string";
  if (prop.arrayItemType !== null) {
    const inner = prop.arrayItemType.startsWith("#")
      ? toPascalCase(prop.arrayItemType.split("/").pop() ?? prop.arrayItemType)
      : prop.arrayItemType;
    return `[]${inner}`;
  }
  switch (prop.type) {
    case "integer":
      return "int64";
    case "number":
      return "float64";
    case "boolean":
      return "bool";
    case "object":
      return "map[string]interface{}";
    default:
      return "string";
  }
}

function emitGoModel(model: ModelDefinition): string {
  return emit((e) => {
    if (model.description) e.line(`// ${toPascalCase(model.name)} ${model.description}`);
    e.open(`type ${toPascalCase(model.name)} struct {`);
    for (const prop of model.properties) {
      const goName = toPascalCase(prop.name);
      let goType = goPropertyType(prop);
      if (!prop.required || prop.nullable) goType = `*${goType}`;
      const jsonTag = `json:"${prop.name}${prop.required ? "" : ",omitempty"}"`;
      if (prop.description) e.line(`// ${prop.description}`);
      e.line(`${goName} ${goType} \`${jsonTag}\``);
    }
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// Public dispatcher
// ---------------------------------------------------------------------------

/** Generate a model definition string for the specified target language. */
export function generateModel(model: ModelDefinition, target: SdkTarget): string {
  switch (target) {
    case "typescript":
      return emitTsModel(model);
    case "python":
      return emitPyModel(model);
    case "go":
      return emitGoModel(model);
  }
}

/** Generate all models and return a map of model name → emitted string. */
export function generateModels(
  models: readonly ModelDefinition[],
  target: SdkTarget,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (const model of models) {
    result.set(model.name, generateModel(model, target));
  }
  return result;
}
