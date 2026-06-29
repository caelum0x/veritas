// Resource client generator: produces TypeScript resource class source strings from OpenAPI path descriptors.

import { emit } from "./emitter.js";
import {
  toPascalCase,
  toCamelCase,
  resourceClassName,
  operationMethodName,
  schemaTypeName,
} from "./naming.js";
import {
  renderFileBanner,
  renderImports,
  renderListParamsInterface,
  renderClass,
  renderTypeAlias,
} from "./template.js";
import type { ImportSpec, MethodParam, MethodSpec } from "./template.js";

export interface PathOperation {
  readonly httpMethod: string;
  readonly pathTemplate: string;
  readonly operationId?: string;
  readonly summary?: string;
  readonly requestBodyRef?: string;
  readonly responseRef?: string;
  readonly queryParams?: ReadonlyArray<string>;
  readonly idParam?: string;
}

export interface ResourceDescriptor {
  /** Path segment used as the resource name, e.g. "orders". */
  readonly name: string;
  /** All operations belonging to this resource. */
  readonly operations: ReadonlyArray<PathOperation>;
}

/** Generate the full TypeScript source for a resource sub-client file. */
export function generateResourceClient(descriptor: ResourceDescriptor): string {
  const resourceName = descriptor.name;
  const className = resourceClassName(resourceName);
  const typeName = toPascalCase(resourceName.endsWith("s")
    ? resourceName.slice(0, -1)
    : resourceName);

  const usedTypes = new Set<string>();
  const methods: MethodSpec[] = [];

  for (const op of descriptor.operations) {
    const methodName = op.operationId
      ? toCamelCase(op.operationId)
      : operationMethodName(op.httpMethod, op.pathTemplate);

    const responseType = op.responseRef
      ? schemaTypeName(op.responseRef)
      : typeName;

    const requestType = op.requestBodyRef
      ? schemaTypeName(op.requestBodyRef)
      : null;

    if (responseType) usedTypes.add(responseType);
    if (requestType) usedTypes.add(requestType);

    const isList = methodName === "list";
    const returnType = isList
      ? `ApiPage<${responseType}>`
      : `ApiResponse<${responseType}>`;

    const params: MethodParam[] = [];
    const bodyLines: string[] = [];

    // Path id param
    if (op.idParam) {
      params.push({ name: op.idParam, type: "string" });
    }

    // Request body param
    if (requestType) {
      params.push({ name: "data", type: requestType });
    }

    // Query params for list operations
    if (isList || (op.queryParams && op.queryParams.length > 0)) {
      params.push({
        name: "params",
        type: `List${toPascalCase(resourceName)}Params`,
        optional: true,
      });
    }

    // Idempotency key for mutations
    if (op.httpMethod.toUpperCase() === "POST" && !isList) {
      params.push({ name: "idempotencyKey", type: "string", optional: true });
    }

    // Build path
    const pathExpr = op.idParam
      ? `\`${op.pathTemplate.replace("{" + op.idParam + "}", "${encodeURIComponent(" + op.idParam + ")}")}\``
      : `"${op.pathTemplate}"`;

    // Build request options
    bodyLines.push(`const result = await this.transport.request({`);
    bodyLines.push(`  method: "${op.httpMethod.toUpperCase()}",`);
    bodyLines.push(`  path: ${pathExpr},`);

    if (requestType) {
      bodyLines.push(`  body: data,`);
    }

    if (isList || (op.queryParams && op.queryParams.length > 0)) {
      bodyLines.push(`  query: params as Record<string, string | number | boolean | undefined>,`);
    }

    if (op.httpMethod.toUpperCase() === "POST" && !isList) {
      bodyLines.push(`  idempotencyKey,`);
    }

    bodyLines.push(`});`);
    bodyLines.push(``);
    bodyLines.push(`if (result.ok) {`);
    bodyLines.push(`  return result.value.body as ${returnType};`);
    bodyLines.push(`}`);
    bodyLines.push(`throw result.error;`);

    methods.push({
      name: methodName,
      params,
      returnType,
      isAsync: true,
      docComment: op.summary,
      body: bodyLines.join("\n"),
    });
  }

  // Build imports
  const contractTypes = [...usedTypes];
  const createTypes = contractTypes
    .filter((t) => t.startsWith("Create") || t.startsWith("Update"))
    .map((t) => `${t}Schema`);

  const imports: ImportSpec[] = [
    {
      names: contractTypes,
      from: "@veritas/contracts",
      isType: true,
    },
  ];

  if (createTypes.length > 0) {
    imports.push({ names: createTypes, from: "@veritas/contracts", isType: false });
  }

  imports.push({
    names: ["ApiResponse", "ApiPage"],
    from: "@veritas/core",
    isType: true,
  });

  imports.push({
    names: ["Transport"],
    from: "../http/transport.js",
    isType: true,
  });

  imports.push({
    names: ["SdkConfig"],
    from: "../config.js",
    isType: true,
  });

  const listParamsInterface = renderListParamsInterface(resourceName);

  const classSource = renderClass({
    name: className,
    docComment: `Resource client for ${resourceName} API operations.`,
    constructorParams: [
      { name: "transport", type: "Transport" },
      { name: "_config", type: "SdkConfig" },
    ],
    methods,
    exported: true,
  });

  return emit((e) => {
    e.line(renderFileBanner(`${className}: generated resource client for ${resourceName}.`));
    e.blank();
    e.line(renderImports(imports));
    e.blank();
    e.line(listParamsInterface);
    e.blank();
    e.line(classSource);
  });
}

/** Generate type alias re-exports for a resource's primary schema type. */
export function generateResourceTypeAliases(
  descriptor: ResourceDescriptor,
): string {
  const typeName = toPascalCase(
    descriptor.name.endsWith("s") ? descriptor.name.slice(0, -1) : descriptor.name,
  );
  return [
    renderTypeAlias(typeName, `z.infer<typeof ${typeName}Schema>`),
    renderTypeAlias(`Create${typeName}`, `z.infer<typeof Create${typeName}Schema>`),
    renderTypeAlias(`Update${typeName}`, `z.infer<typeof Update${typeName}Schema>`),
  ].join("\n");
}
