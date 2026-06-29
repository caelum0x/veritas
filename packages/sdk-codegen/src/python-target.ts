// Python client descriptor: emits Python dataclass + httpx-based resource strings.
import type {
  CodegenIR,
  EmittedFile,
  OperationDefinition,
  ResourceGroup,
  TargetDescriptor,
} from "./types.js";
import { emit } from "./emitter.js";
import { generateModels } from "./model-gen.js";
import { toSnakeCase, toPascalCase, pythonModuleName } from "./naming.js";

// ---------------------------------------------------------------------------
// Method emitter
// ---------------------------------------------------------------------------

function emitPyMethod(op: OperationDefinition): string {
  const pathParams = op.parameters.filter((p) => p.in === "path");
  const queryParams = op.parameters.filter((p) => p.in === "query");
  const methodName = toSnakeCase(op.operationId);

  const paramList: string[] = ["self"];
  for (const p of pathParams) paramList.push(`${toSnakeCase(p.name)}: str`);
  if (op.requestBodyType) paramList.push(`body: ${toPascalCase(op.requestBodyType)}`);
  if (queryParams.length > 0) {
    for (const q of queryParams) paramList.push(`${toSnakeCase(q.name)}: Optional[str] = None`);
  }

  const returnType = op.responseType ? toPascalCase(op.responseType) : "Any";

  return emit((e) => {
    if (op.description) {
      e.line(`def ${methodName}(${paramList.join(", ")}) -> ${returnType}:`);
      e.indent();
      e.line(`"""${op.description}"""`);
    } else {
      e.open(`def ${methodName}(${paramList.join(", ")}) -> ${returnType}:`);
    }

    // Build path
    let pathStr = op.path;
    for (const p of pathParams) {
      pathStr = pathStr.replace(`{${p.name}}`, `{${toSnakeCase(p.name)}}`);
    }
    e.line(`path = f"${pathStr}"`);

    const qDict = queryParams
      .map((q) => `"${q.name}": ${toSnakeCase(q.name)}`)
      .join(", ");
    if (queryParams.length > 0) e.line(`params = {${qDict}}`);

    const hasBody = op.requestBodyType !== null;
    const hasQuery = queryParams.length > 0;

    if (op.method === "GET") {
      if (hasQuery) {
        e.line(
          `response = self._client.${op.method.toLowerCase()}(path, params={k: v for k, v in params.items() if v is not None})`,
        );
      } else {
        e.line(`response = self._client.${op.method.toLowerCase()}(path)`);
      }
    } else if (hasBody) {
      const jsonArg = hasQuery
        ? `json=body.__dict__, params=params`
        : `json=body.__dict__`;
      e.line(`response = self._client.${op.method.toLowerCase()}(path, ${jsonArg})`);
    } else {
      e.line(`response = self._client.${op.method.toLowerCase()}(path)`);
    }

    e.line("response.raise_for_status()");
    if (op.responseType) {
      e.line(`return ${toPascalCase(op.responseType)}(**response.json())`);
    } else {
      e.line("return response.json()");
    }
    e.dedent();
  });
}

// ---------------------------------------------------------------------------
// Per-resource class emitter
// ---------------------------------------------------------------------------

function emitPyResource(group: ResourceGroup): string {
  const className = `${toPascalCase(group.tag)}Resource`;
  return emit((e) => {
    e.line(`"""Resource client for ${group.tag} endpoints."""`);
    e.blank();
    e.open(`class ${className}:`);
    e.open("def __init__(self, client: httpx.Client, base_url: str) -> None:");
    e.line("self._client = client");
    e.line("self._base_url = base_url");
    e.close("");
    e.blank();
    for (const op of group.operations) {
      e.line(emitPyMethod(op));
      e.blank();
    }
    e.close("");
  });
}

// ---------------------------------------------------------------------------
// Root client emitter
// ---------------------------------------------------------------------------

function emitPyClient(groups: readonly ResourceGroup[], packageName: string): string {
  return emit((e) => {
    e.line("# Auto-generated Veritas Python SDK client.");
    e.line("from __future__ import annotations");
    e.line("import httpx");
    e.line("from typing import Optional");
    for (const g of groups) {
      const cls = `${toPascalCase(g.tag)}Resource`;
      const mod = pythonModuleName(g.tag);
      e.line(`from .resources.${mod} import ${cls}`);
    }
    e.blank();
    e.open("class VeritasClient:");
    e.open("def __init__(self, api_key: str, base_url: str = 'https://api.veritas.croo.io/v1') -> None:");
    e.line("self._http = httpx.Client(headers={'Authorization': f'Bearer {api_key}'})");
    e.line("self._base_url = base_url");
    for (const g of groups) {
      const prop = toSnakeCase(g.tag);
      const cls = `${toPascalCase(g.tag)}Resource`;
      e.line(`self.${prop} = ${cls}(self._http, base_url)`);
    }
    e.close("");
    e.blank();
    e.open("def close(self) -> None:");
    e.line("self._http.close()");
    e.close("");
    e.close("");
  });
}

// ---------------------------------------------------------------------------
// models.py emitter
// ---------------------------------------------------------------------------

function emitPyModels(modelMap: ReadonlyMap<string, string>): string {
  return emit((e) => {
    e.line("# Auto-generated model dataclasses.");
    e.line("from __future__ import annotations");
    e.line("from dataclasses import dataclass");
    e.line("from typing import Optional, List, Dict, Any");
    e.blank();
    for (const [, src] of modelMap) {
      e.line(src);
      e.blank();
    }
  });
}

// ---------------------------------------------------------------------------
// setup.cfg emitter
// ---------------------------------------------------------------------------

function emitSetupCfg(packageName: string, version: string): string {
  return emit((e) => {
    e.line("[metadata]");
    e.line(`name = ${packageName}`);
    e.line(`version = ${version}`);
    e.line("description = Veritas Python SDK — auto-generated");
    e.line("license = MIT");
    e.blank();
    e.line("[options]");
    e.line("packages = find:");
    e.line("install_requires =");
    e.line("    httpx>=0.27.0");
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function generatePythonTarget(ir: CodegenIR): TargetDescriptor {
  const { models, resources, options } = ir;
  const modelMap = generateModels(models, "python");
  const files: EmittedFile[] = [];

  files.push({
    path: "models.py",
    content: emitPyModels(modelMap),
    language: "python",
  });

  for (const group of resources) {
    const mod = pythonModuleName(group.tag);
    const header =
      `# Auto-generated resource client: ${group.tag}.\n` +
      `from __future__ import annotations\n` +
      `import httpx\n` +
      `from typing import Optional, Any\n` +
      `from ..models import *\n\n`;
    files.push({
      path: `resources/${mod}.py`,
      content: header + emitPyResource(group),
      language: "python",
    });
  }

  files.push({
    path: "client.py",
    content: emitPyClient(resources, options.packageName),
    language: "python",
  });

  files.push({
    path: "setup.cfg",
    content: emitSetupCfg(options.packageName, options.packageVersion),
    language: "python",
  });

  return {
    target: "python",
    files,
    packageMeta: {
      name: options.packageName,
      version: options.packageVersion,
      description: "Veritas Python SDK — auto-generated",
      language: "python",
      repositoryUrl: null,
      license: "MIT",
    },
  };
}
