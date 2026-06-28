// Code template helpers: small composable string builders for common code patterns.

import { emit } from "./emitter.js";
import { toCamelCase, toPascalCase } from "./naming.js";

export interface ImportSpec {
  readonly names: ReadonlyArray<string>;
  readonly from: string;
  readonly isType?: boolean;
}

/** Render a TypeScript named import statement. */
export function renderImport(spec: ImportSpec): string {
  const qualifier = spec.isType ? "import type" : "import";
  const names = [...spec.names].sort().join(", ");
  return `${qualifier} { ${names} } from "${spec.from}";`;
}

/** Render a block of import statements, type imports first then value imports. */
export function renderImports(specs: ReadonlyArray<ImportSpec>): string {
  const typeImports = specs.filter((s) => s.isType);
  const valueImports = specs.filter((s) => !s.isType);
  const all = [...typeImports, ...valueImports];
  return all.map(renderImport).join("\n");
}

export interface MethodParam {
  readonly name: string;
  readonly type: string;
  readonly optional?: boolean;
  readonly defaultValue?: string;
}

/** Render a TypeScript method parameter. */
export function renderParam(p: MethodParam): string {
  const opt = p.optional && !p.defaultValue ? "?" : "";
  const def = p.defaultValue ? ` = ${p.defaultValue}` : "";
  return `${p.name}${opt}: ${p.type}${def}`;
}

export interface MethodSpec {
  readonly name: string;
  readonly params: ReadonlyArray<MethodParam>;
  readonly returnType: string;
  readonly isAsync?: boolean;
  readonly docComment?: string;
  readonly body: string;
}

/** Render a TypeScript class method. */
export function renderMethod(spec: MethodSpec): string {
  return emit((e) => {
    if (spec.docComment) {
      e.line(`/** ${spec.docComment} */`);
    }
    const asyncKw = spec.isAsync ? "async " : "";
    const params = spec.params.map(renderParam).join(", ");
    const ret = spec.isAsync ? `Promise<${spec.returnType}>` : spec.returnType;
    e.open(`${asyncKw}${spec.name}(${params}): ${ret} {`);
    for (const bodyLine of spec.body.split("\n")) {
      e.line(bodyLine);
    }
    e.close("}");
  });
}

export interface ClassSpec {
  readonly name: string;
  readonly docComment?: string;
  readonly constructorParams?: ReadonlyArray<MethodParam>;
  readonly methods: ReadonlyArray<MethodSpec>;
  readonly exported?: boolean;
}

/** Render a TypeScript class with constructor and methods. */
export function renderClass(spec: ClassSpec): string {
  return emit((e) => {
    if (spec.docComment) {
      e.line(`/** ${spec.docComment} */`);
    }
    const exportKw = spec.exported !== false ? "export " : "";
    e.open(`${exportKw}class ${spec.name} {`);

    if (spec.constructorParams && spec.constructorParams.length > 0) {
      const ctorParams = spec.constructorParams.map((p) => `private readonly ${renderParam(p)}`).join(",\n    ");
      e.line(`constructor(`);
      e.indented(() => {
        for (const p of spec.constructorParams!) {
          e.line(`private readonly ${renderParam(p)},`);
        }
      });
      e.line(`) {}`);
      e.blank();
      // suppress unused variable for ctorParams
      void ctorParams;
    }

    for (let i = 0; i < spec.methods.length; i++) {
      const method = spec.methods[i]!;
      const rendered = renderMethod(method);
      for (const row of rendered.split("\n")) {
        e.line(row);
      }
      if (i < spec.methods.length - 1) {
        e.blank();
      }
    }

    e.close("}");
  });
}

export interface InterfaceField {
  readonly name: string;
  readonly type: string;
  readonly optional?: boolean;
  readonly docComment?: string;
}

export interface InterfaceSpec {
  readonly name: string;
  readonly docComment?: string;
  readonly fields: ReadonlyArray<InterfaceField>;
  readonly exported?: boolean;
}

/** Render a TypeScript interface. */
export function renderInterface(spec: InterfaceSpec): string {
  return emit((e) => {
    if (spec.docComment) {
      e.line(`/** ${spec.docComment} */`);
    }
    const exportKw = spec.exported !== false ? "export " : "";
    e.open(`${exportKw}interface ${spec.name} {`);
    for (const field of spec.fields) {
      if (field.docComment) {
        e.line(`/** ${field.docComment} */`);
      }
      const opt = field.optional ? "?" : "";
      e.line(`readonly ${field.name}${opt}: ${field.type};`);
    }
    e.close("}");
  });
}

/** Render a file-level doc comment from a purpose string. */
export function renderFileBanner(purpose: string): string {
  return `// ${purpose}`;
}

/** Render a TypeScript re-export barrel line. */
export function renderReExport(from: string, names?: ReadonlyArray<string>): string {
  if (!names || names.length === 0) {
    return `export * from "${from}";`;
  }
  return `export { ${[...names].sort().join(", ")} } from "${from}";`;
}

/** Render a simple type alias. */
export function renderTypeAlias(
  name: string,
  type: string,
  exported = true,
): string {
  const exportKw = exported ? "export " : "";
  return `${exportKw}type ${name} = ${type};`;
}

/** Render a list params interface for a resource. */
export function renderListParamsInterface(resourceName: string, extraFields?: ReadonlyArray<InterfaceField>): string {
  const base: InterfaceField[] = [
    { name: "limit", type: "number", optional: true, docComment: "Maximum results per page." },
    { name: "cursor", type: "string", optional: true, docComment: "Opaque pagination cursor." },
  ];
  return renderInterface({
    name: `List${toPascalCase(resourceName)}Params`,
    docComment: `Query parameters for listing ${toCamelCase(resourceName)} resources.`,
    fields: [...base, ...(extraFields ?? [])],
    exported: true,
  });
}
