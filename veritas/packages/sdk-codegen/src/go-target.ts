// Go client descriptor: emits Go struct definitions and net/http resource client strings.
import type {
  CodegenIR,
  EmittedFile,
  OperationDefinition,
  ResourceGroup,
  TargetDescriptor,
} from "./types.js";
import { emit } from "./emitter.js";
import { generateModels } from "./model-gen.js";
import { toPascalCase, toSnakeCase, goPackageName } from "./naming.js";

// ---------------------------------------------------------------------------
// Method emitter
// ---------------------------------------------------------------------------

function emitGoMethod(op: OperationDefinition, receiverName: string): string {
  const pathParams = op.parameters.filter((p) => p.in === "path");
  const queryParams = op.parameters.filter((p) => p.in === "query");
  const methodName = toPascalCase(op.operationId);
  const returnType = op.responseType ? toPascalCase(op.responseType) : "map[string]interface{}";

  const paramList: string[] = [];
  for (const p of pathParams) paramList.push(`${toCamelGoParam(p.name)} string`);
  if (op.requestBodyType) {
    paramList.push(`body ${toPascalCase(op.requestBodyType)}`);
  }
  if (queryParams.length > 0) {
    paramList.push(`query map[string]string`);
  }

  const paramStr = paramList.join(", ");

  return emit((e) => {
    if (op.description) e.line(`// ${methodName} ${op.description}`);
    if (op.deprecated) e.line("// Deprecated: use a newer endpoint.");
    e.open(
      `func (c *${receiverName}) ${methodName}(${paramStr}) (*${returnType}, error) {`,
    );

    // Build path
    let pathExpr = `"${op.path}"`;
    for (const p of pathParams) {
      const goVar = toCamelGoParam(p.name);
      pathExpr = pathExpr.replace(`{${p.name}}`, `" + url.PathEscape(${goVar}) + "`);
    }
    // Clean up edge artifacts
    pathExpr = pathExpr.replace(/\+ ""/g, "").replace(/"" \+/g, "");
    if (pathParams.length > 0) pathExpr = `"${pathExpr.slice(1, -1)}"`;

    e.line(`path := ${pathExpr}`);

    if (queryParams.length > 0) {
      e.line("q := url.Values{}");
      e.line('for k, v := range query { q.Set(k, v) }');
      e.line('if len(q) > 0 { path += "?" + q.Encode() }');
    }

    const hasBody = op.requestBodyType !== null;

    if (hasBody) {
      e.line("bodyBytes, err := json.Marshal(body)");
      e.line("if err != nil { return nil, err }");
      e.line(`req, err := http.NewRequest("${op.method}", c.baseURL+path, bytes.NewReader(bodyBytes))`);
    } else {
      e.line(`req, err := http.NewRequest("${op.method}", c.baseURL+path, nil)`);
    }
    e.line("if err != nil { return nil, err }");
    e.line(`req.Header.Set("Authorization", "Bearer "+c.apiKey)`);
    if (hasBody) e.line(`req.Header.Set("Content-Type", "application/json")`);

    e.line("resp, err := c.http.Do(req)");
    e.line("if err != nil { return nil, err }");
    e.line("defer resp.Body.Close()");
    e.line("if resp.StatusCode >= 400 { return nil, fmt.Errorf(\"veritas: HTTP %d\", resp.StatusCode) }");
    e.line(`var result ${returnType}`);
    e.line("if err := json.NewDecoder(resp.Body).Decode(&result); err != nil { return nil, err }");
    e.line("return &result, nil");
    e.close("}");
  });
}

function toCamelGoParam(name: string): string {
  const parts = name.split(/[_-]/);
  return (
    (parts[0] ?? "").toLowerCase() +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("")
  );
}

// ---------------------------------------------------------------------------
// Per-resource file emitter
// ---------------------------------------------------------------------------

function emitGoResource(group: ResourceGroup, modulePath: string): string {
  const receiverName = `${toPascalCase(group.tag)}Resource`;
  return emit((e) => {
    e.line(`// Package ${goPackageName(group.tag)} — auto-generated resource client.`);
    e.line(`package ${goPackageName(group.tag)}`);
    e.blank();
    e.line("import (");
    e.indent();
    e.line('"bytes"');
    e.line('"encoding/json"');
    e.line('"fmt"');
    e.line('"net/http"');
    e.line('"net/url"');
    e.blank();
    e.line(`"${modulePath}/models"`);
    e.dedent();
    e.line(")");
    e.blank();
    e.line(`// ${receiverName} provides methods for the ${group.tag} API resource.`);
    e.open(`type ${receiverName} struct {`);
    e.line("http    *http.Client");
    e.line("baseURL string");
    e.line("apiKey  string");
    e.close("}");
    e.blank();
    e.open(
      `func New${receiverName}(http *http.Client, baseURL, apiKey string) *${receiverName} {`,
    );
    e.line(`return &${receiverName}{http: http, baseURL: baseURL, apiKey: apiKey}`);
    e.close("}");
    e.blank();
    for (const op of group.operations) {
      e.line(emitGoMethod(op, receiverName));
      e.blank();
    }
  });
}

// ---------------------------------------------------------------------------
// Root client emitter
// ---------------------------------------------------------------------------

function emitGoClient(
  groups: readonly ResourceGroup[],
  modulePath: string,
  baseUrl: string,
): string {
  return emit((e) => {
    e.line("// Package veritas — auto-generated Veritas Go SDK root client.");
    e.line("package veritas");
    e.blank();
    e.line("import (");
    e.indent();
    e.line('"net/http"');
    e.blank();
    for (const g of groups) {
      const pkg = goPackageName(g.tag);
      e.line(`"${modulePath}/${pkg}"`);
    }
    e.dedent();
    e.line(")");
    e.blank();
    e.line(`const defaultBaseURL = "${baseUrl}"`);
    e.blank();
    e.open("type Client struct {");
    for (const g of groups) {
      e.line(`${toPascalCase(g.tag)} *${goPackageName(g.tag)}.${toPascalCase(g.tag)}Resource`);
    }
    e.close("}");
    e.blank();
    e.open("func NewClient(apiKey string) *Client {");
    e.line("h := &http.Client{}");
    e.open("return &Client{");
    for (const g of groups) {
      const pkg = goPackageName(g.tag);
      const cls = `${toPascalCase(g.tag)}Resource`;
      e.line(`${toPascalCase(g.tag)}: ${pkg}.New${cls}(h, defaultBaseURL, apiKey),`);
    }
    e.close("}");
    e.close("}");
  });
}

// ---------------------------------------------------------------------------
// models.go emitter
// ---------------------------------------------------------------------------

function emitGoModels(modelMap: ReadonlyMap<string, string>): string {
  return emit((e) => {
    e.line("// Package models — auto-generated model structs.");
    e.line("package models");
    e.blank();
    for (const [, src] of modelMap) {
      e.line(src);
      e.blank();
    }
  });
}

// ---------------------------------------------------------------------------
// go.mod emitter
// ---------------------------------------------------------------------------

function emitGoMod(packageName: string): string {
  const modPath = `github.com/veritas/${packageName}`;
  return emit((e) => {
    e.line(`module ${modPath}`);
    e.blank();
    e.line("go 1.21");
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function generateGoTarget(ir: CodegenIR): TargetDescriptor {
  const { models, resources, options } = ir;
  const modulePath = `github.com/veritas/${options.packageName}`;
  const modelMap = generateModels(models, "go");
  const files: EmittedFile[] = [];

  files.push({
    path: "models/models.go",
    content: emitGoModels(modelMap),
    language: "go",
  });

  for (const group of resources) {
    const pkg = goPackageName(group.tag);
    files.push({
      path: `${pkg}/${pkg}.go`,
      content: emitGoResource(group, modulePath),
      language: "go",
    });
  }

  files.push({
    path: "client.go",
    content: emitGoClient(resources, modulePath, options.baseUrl),
    language: "go",
  });

  files.push({
    path: "go.mod",
    content: emitGoMod(options.packageName),
    language: "go",
  });

  return {
    target: "go",
    files,
    packageMeta: {
      name: options.packageName,
      version: options.packageVersion,
      description: "Veritas Go SDK — auto-generated",
      language: "go",
      repositoryUrl: null,
      license: "MIT",
    },
  };
}
