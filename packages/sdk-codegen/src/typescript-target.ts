// TypeScript client codegen target: emits .ts source files for the Veritas SDK.
import type {
  CodegenIR,
  EmittedFile,
  OperationDefinition,
  ResourceGroup,
  TargetDescriptor,
} from "./types.js";
import { emit } from "./emitter.js";
import { generateModels } from "./model-gen.js";
import { toPascalCase, toCamelCase, resourceClassName, operationMethodName } from "./naming.js";

// ---------------------------------------------------------------------------
// Per-operation method emitter
// ---------------------------------------------------------------------------

function emitTsMethod(op: OperationDefinition): string {
  const methodName = operationMethodName(op.method, op.path);
  const pathParams = op.parameters.filter((p) => p.in === "path");
  const queryParams = op.parameters.filter((p) => p.in === "query");

  const paramList: string[] = pathParams.map((p) => `${toCamelCase(p.name)}: string`);
  if (op.requestBodyType) paramList.push(`body: ${op.requestBodyType}`);
  if (queryParams.length > 0) {
    const qFields = queryParams.map((p) => `${p.name}?: string`).join("; ");
    paramList.push(`query?: { ${qFields} }`);
  }

  const returnType = op.responseType ?? "unknown";

  return emit((e) => {
    if (op.description) e.line(`/** ${op.description} */`);
    if (op.deprecated) e.line("/** @deprecated */");
    e.open(
      `async ${methodName}(${paramList.join(", ")}): Promise<ApiResponse<${returnType}>> {`,
    );

    // Build path
    let pathExpr = JSON.stringify(op.path);
    for (const p of pathParams) {
      pathExpr = pathExpr.replace(
        `{${p.name}}`,
        `\${encodeURIComponent(${toCamelCase(p.name)})}`,
      );
    }
    if (pathParams.length > 0) pathExpr = "`" + pathExpr.slice(1, -1) + "`";

    e.line(`const result = await this.transport.request({`);
    e.indent();
    e.line(`method: "${op.method}",`);
    e.line(`path: ${pathExpr},`);
    if (op.requestBodyType) e.line("body,");
    if (queryParams.length > 0) e.line("query: query as Record<string, string | undefined>,");
    e.dedent();
    e.line("});");
    e.line("if (result.ok) return result.value.body as ApiResponse<" + returnType + ">;");
    e.line("throw result.error;");
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// Per-resource class emitter
// ---------------------------------------------------------------------------

function emitTsResource(group: ResourceGroup): string {
  const className = resourceClassName(group.tag);
  return emit((e) => {
    e.line(`/** Resource client for ${group.tag} endpoints. */`);
    e.open(`export class ${className} {`);
    e.line("constructor(");
    e.indent();
    e.line("private readonly transport: Transport,");
    e.line("private readonly _config: SdkConfig,");
    e.dedent();
    e.line(") {}");
    e.blank();
    for (const op of group.operations) {
      e.line(emitTsMethod(op));
      e.blank();
    }
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// Root client emitter
// ---------------------------------------------------------------------------

function emitRootClient(groups: readonly ResourceGroup[], baseUrl: string): string {
  return emit((e) => {
    e.line("// Auto-generated Veritas TypeScript SDK root client.");
    e.line('import type { ApiResponse, ApiPage } from "@veritas/core";');
    e.line('import type { SdkConfig } from "./config.js";');
    e.line('import type { Transport } from "./http/transport.js";');
    e.blank();
    for (const g of groups) {
      const cls = resourceClassName(g.tag);
      e.line(`import { ${cls} } from "./resources/${g.tag}.js";`);
    }
    e.blank();
    e.line(`export const DEFAULT_BASE_URL = "${baseUrl}";`);
    e.blank();
    e.open("export class VeritasClient {");
    for (const g of groups) {
      e.line(`private _${toCamelCase(g.tag)}?: ${resourceClassName(g.tag)};`);
    }
    e.blank();
    e.line(
      "constructor(private readonly config: SdkConfig, private readonly transport: Transport) {}",
    );
    e.blank();
    for (const g of groups) {
      const prop = toCamelCase(g.tag);
      const cls = resourceClassName(g.tag);
      e.open(`get ${prop}(): ${cls} {`);
      e.line(
        `this._${prop} ??= new ${cls}(this.transport, this.config);`,
      );
      e.line(`return this._${prop};`);
      e.close("}");
      e.blank();
    }
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// Index barrel emitter
// ---------------------------------------------------------------------------

function emitBarrel(groups: readonly ResourceGroup[]): string {
  return emit((e) => {
    e.line("// Auto-generated barrel — re-exports all resource clients and models.");
    e.line('export * from "./client.js";');
    e.line('export * from "./models.js";');
    for (const g of groups) {
      e.line(`export * from "./resources/${g.tag}.js";`);
    }
  });
}

// ---------------------------------------------------------------------------
// Models barrel emitter
// ---------------------------------------------------------------------------

function emitModelsFile(modelMap: ReadonlyMap<string, string>): string {
  return emit((e) => {
    e.line("// Auto-generated model interfaces.");
    e.blank();
    for (const [, src] of modelMap) {
      e.line(src);
      e.blank();
    }
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function generateTypeScriptTarget(ir: CodegenIR): TargetDescriptor {
  const { models, resources, options } = ir;
  const modelMap = generateModels(models, "typescript");
  const files: EmittedFile[] = [];

  // models.ts
  files.push({
    path: "src/models.ts",
    content: emitModelsFile(modelMap),
    language: "typescript",
  });

  // resource files
  for (const group of resources) {
    const header =
      `// Auto-generated resource client: ${group.tag}.\n` +
      `import type { ApiResponse, ApiPage } from "@veritas/core";\n` +
      `import type { Transport } from "../http/transport.js";\n` +
      `import type { SdkConfig } from "../config.js";\n\n`;
    files.push({
      path: `src/resources/${group.tag}.ts`,
      content: header + emitTsResource(group),
      language: "typescript",
    });
  }

  // client.ts
  files.push({
    path: "src/client.ts",
    content: emitRootClient(resources, options.baseUrl),
    language: "typescript",
  });

  // index.ts
  files.push({
    path: "src/index.ts",
    content: emitBarrel(resources),
    language: "typescript",
  });

  return {
    target: "typescript",
    files,
    packageMeta: {
      name: options.packageName,
      version: options.packageVersion,
      description: `Veritas TypeScript SDK — auto-generated`,
      language: "typescript",
      repositoryUrl: null,
      license: "MIT",
    },
  };
}
