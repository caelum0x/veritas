// Generates MockDefinition descriptors from contract route specs (emits strings/objects only).
import { type MockDefinition, type MockMatcher, type MockResponse } from "./mock.js";
import { fixtureOk, fixtureCreated, fixtureNotFound, fixturePage } from "./fixtures.js";

export interface RouteSpec {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly resourceName: string;
  readonly exampleItem?: unknown;
  readonly exampleList?: readonly unknown[];
}

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter}`;
}

function defaultResponseForMethod(
  method: RouteSpec["method"],
  resourceName: string,
  exampleItem: unknown,
  exampleList: readonly unknown[],
): MockResponse {
  switch (method) {
    case "GET":
      if (exampleList.length > 0) {
        return fixturePage(exampleList, exampleList.length);
      }
      return fixtureOk(exampleItem ?? { id: `mock-${resourceName}-id` });
    case "POST":
      return fixtureCreated(exampleItem ?? { id: `mock-${resourceName}-id` });
    case "PUT":
    case "PATCH":
      return fixtureOk(exampleItem ?? { id: `mock-${resourceName}-id` });
    case "DELETE":
      return { status: 204, headers: {}, body: undefined, delay: 0 };
  }
}

export function generateMockFromRoute(spec: RouteSpec): MockDefinition {
  const matcher: MockMatcher = {
    method: spec.method,
    path: spec.path,
    pathIsRegex: false,
  };
  const response = defaultResponseForMethod(
    spec.method,
    spec.resourceName,
    spec.exampleItem ?? null,
    spec.exampleList ?? [],
  );
  return {
    id: nextId(`gen-${spec.resourceName}-${spec.method.toLowerCase()}`),
    name: `Generated: ${spec.method} ${spec.path}`,
    matcher,
    response,
    priority: 0,
    enabled: true,
    callCount: 0,
  };
}

export function generateCrudMocks(
  basePath: string,
  resourceName: string,
  exampleItem?: unknown,
): readonly MockDefinition[] {
  const specs: RouteSpec[] = [
    { method: "GET", path: basePath, resourceName, exampleList: exampleItem ? [exampleItem] : [] },
    { method: "POST", path: basePath, resourceName, exampleItem },
    { method: "GET", path: `${basePath}/:id`, resourceName, exampleItem },
    { method: "PUT", path: `${basePath}/:id`, resourceName, exampleItem },
    { method: "PATCH", path: `${basePath}/:id`, resourceName, exampleItem },
    { method: "DELETE", path: `${basePath}/:id`, resourceName },
  ];
  return specs.map(generateMockFromRoute);
}

export function generateNotFoundMock(path: string, method: RouteSpec["method"] = "GET"): MockDefinition {
  return {
    id: nextId(`gen-not-found`),
    name: `Generated: ${method} ${path} → 404`,
    matcher: { method, path, pathIsRegex: false },
    response: fixtureNotFound(),
    priority: -10,
    enabled: true,
    callCount: 0,
  };
}
