// Route registry that accumulates RouteDescriptors and builds the final OpenApiDocument.
import type {
  OpenApiDocument,
  PathItemObject,
  OperationObject,
  RegistryOptions,
  RouteDescriptor,
  ComponentsObject,
  HttpMethod,
} from "./types.js";
import { DuplicateRouteError } from "./errors.js";

interface RegistryState {
  readonly routes: readonly RouteDescriptor[];
  readonly options: RegistryOptions;
}

function operationFromDescriptor(route: RouteDescriptor): OperationObject {
  const operation: OperationObject = {
    responses: route.responses,
  };

  return {
    ...operation,
    ...(route.operationId !== undefined && { operationId: route.operationId }),
    ...(route.summary !== undefined && { summary: route.summary }),
    ...(route.description !== undefined && { description: route.description }),
    ...(route.tags !== undefined && route.tags.length > 0 && { tags: [...route.tags] }),
    ...(route.parameters !== undefined &&
      route.parameters.length > 0 && { parameters: [...route.parameters] }),
    ...(route.requestBody !== undefined && { requestBody: route.requestBody }),
    ...(route.security !== undefined && { security: [...route.security] }),
    ...(route.deprecated === true && { deprecated: true }),
  };
}

function buildPaths(routes: readonly RouteDescriptor[]): Record<string, PathItemObject> {
  const paths: Record<string, Record<string, OperationObject>> = {};

  for (const route of routes) {
    const existing = paths[route.path] ?? {};
    paths[route.path] = {
      ...existing,
      [route.method]: operationFromDescriptor(route),
    };
  }

  return paths as Record<string, PathItemObject>;
}

function mergeComponents(
  base: ComponentsObject | undefined,
  override: ComponentsObject | undefined,
): ComponentsObject | undefined {
  if (base === undefined && override === undefined) return undefined;
  return {
    schemas: { ...base?.schemas, ...override?.schemas },
    responses: { ...base?.responses, ...override?.responses },
    parameters: { ...base?.parameters, ...override?.parameters },
    securitySchemes: { ...base?.securitySchemes, ...override?.securitySchemes },
  };
}

function isDuplicateRoute(
  routes: readonly RouteDescriptor[],
  method: HttpMethod,
  path: string,
): boolean {
  return routes.some((r) => r.method === method && r.path === path);
}

export interface SpecRegistry {
  readonly register: (route: RouteDescriptor) => SpecRegistry;
  readonly registerAll: (routes: readonly RouteDescriptor[]) => SpecRegistry;
  readonly build: () => OpenApiDocument;
  readonly mergeComponents: (components: ComponentsObject) => SpecRegistry;
  readonly routeCount: () => number;
}

function createRegistry(state: RegistryState): SpecRegistry {
  return {
    register(route: RouteDescriptor): SpecRegistry {
      if (isDuplicateRoute(state.routes, route.method, route.path)) {
        throw new DuplicateRouteError(route.method, route.path);
      }
      return createRegistry({ ...state, routes: [...state.routes, route] });
    },

    registerAll(routes: readonly RouteDescriptor[]): SpecRegistry {
      return routes.reduce(
        (registry: SpecRegistry, route) => registry.register(route),
        createRegistry(state),
      );
    },

    build(): OpenApiDocument {
      const { options, routes } = state;
      const paths = buildPaths(routes);
      const components = mergeComponents(undefined, options.components);

      const doc: OpenApiDocument = {
        openapi: "3.1.0",
        info: options.info,
        paths,
        ...(options.servers !== undefined &&
          options.servers.length > 0 && { servers: [...options.servers] }),
        ...(options.tags !== undefined &&
          options.tags.length > 0 && { tags: [...options.tags] }),
        ...(options.security !== undefined && { security: [...options.security] }),
        ...(components !== undefined && { components }),
      };

      return doc;
    },

    mergeComponents(components: ComponentsObject): SpecRegistry {
      return createRegistry({
        ...state,
        options: {
          ...state.options,
          components: mergeComponents(state.options.components, components),
        },
      });
    },

    routeCount(): number {
      return state.routes.length;
    },
  };
}

/** Create a new SpecRegistry initialized with the given options. */
export function createSpecRegistry(options: RegistryOptions): SpecRegistry {
  return createRegistry({ routes: [], options });
}
