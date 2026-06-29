// Naming convention helpers: converts OpenAPI identifiers to language-specific names.

/** Convert a string to PascalCase. */
export function toPascalCase(input: string): string {
  return input
    .replace(/[-_/](.)/g, (_, ch: string) => ch.toUpperCase())
    .replace(/^(.)/, (_, ch: string) => ch.toUpperCase());
}

/** Convert a string to camelCase. */
export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Convert a string to snake_case. */
export function toSnakeCase(input: string): string {
  return input
    .replace(/([A-Z])/g, (ch) => `_${ch.toLowerCase()}`)
    .replace(/[-/]/g, "_")
    .replace(/^_/, "");
}

/** Convert a string to kebab-case. */
export function toKebabCase(input: string): string {
  return toSnakeCase(input).replace(/_/g, "-");
}

/** Derive a TypeScript resource class name from a path segment, e.g. "orders" → "OrdersResource". */
export function resourceClassName(segment: string): string {
  return `${toPascalCase(segment)}Resource`;
}

/** Derive a method name for an HTTP operation, e.g. GET /orders → "list", POST /orders/{id} → "create". */
export function operationMethodName(
  httpMethod: string,
  pathTemplate: string,
): string {
  const method = httpMethod.toUpperCase();
  const hasIdParam = /\{[^}]+\}$/.test(pathTemplate.trim());

  if (method === "GET" && hasIdParam) return "get";
  if (method === "GET") return "list";
  if (method === "POST" && pathTemplate.endsWith("/cancel")) return "cancel";
  if (method === "POST") return "create";
  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return toCamelCase(`${method.toLowerCase()}_${pathTemplate.split("/").pop() ?? "call"}`);
}

/** Derive a TypeScript type name for a schema ref, e.g. "#/components/schemas/Order" → "Order". */
export function schemaTypeName(ref: string): string {
  const parts = ref.split("/");
  return toPascalCase(parts[parts.length - 1] ?? ref);
}

/** Pluralise a resource name for use in list return types. */
export function pluralise(word: string): string {
  if (word.endsWith("s")) return word;
  if (word.endsWith("y")) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** Strip a trailing "s" to get a singular form (best-effort). */
export function singularise(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Convert a Go package name from a resource name, e.g. "ApiKeys" → "apikeys". */
export function goPackageName(resource: string): string {
  return resource.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Convert a Python module name from a resource name, e.g. "ApiKeys" → "api_keys". */
export function pythonModuleName(resource: string): string {
  return toSnakeCase(resource);
}
