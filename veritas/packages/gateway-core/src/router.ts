// Route matcher: resolves an incoming request to a registered Route.
import type { Route, HttpMethod } from "./route.js";
import { rewritePath } from "./route.js";

export interface IncomingRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
}

export interface MatchedRoute {
  readonly route: Route;
  readonly rewrittenPath: string;
  readonly pathParams: Readonly<Record<string, string>>;
}

/** Convert a route path pattern to a RegExp, extracting named param groups. */
function buildPattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexSource = pattern
    .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, (ch) =>
      ch === "/" || ch === ":" ? ch : `\\${ch}`
    )
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    })
    .replace(/\*/g, "(.*)");
  return { regex: new RegExp(`^${regexSource}(?:/)?$`), paramNames };
}

function matchesHeaders(
  required: Readonly<Record<string, string>> | undefined,
  actual: Readonly<Record<string, string>>
): boolean {
  if (!required) return true;
  return Object.entries(required).every(
    ([k, v]) => actual[k.toLowerCase()] === v
  );
}

function matchesQuery(
  required: Readonly<Record<string, string>> | undefined,
  actual: Readonly<Record<string, string>>
): boolean {
  if (!required) return true;
  return Object.entries(required).every(([k, v]) => actual[k] === v);
}

export class Router {
  private readonly routes: ReadonlyArray<Route>;
  private readonly compiled: ReadonlyArray<{
    route: Route;
    regex: RegExp;
    paramNames: string[];
  }>;

  constructor(routes: ReadonlyArray<Route>) {
    this.routes = routes;
    this.compiled = routes.map((route) => {
      const { regex, paramNames } = buildPattern(route.match.path);
      return { route, regex, paramNames };
    });
  }

  /** Match an incoming request to the first applicable route, or return null. */
  match(req: IncomingRequest): MatchedRoute | null {
    for (const entry of this.compiled) {
      const { route, regex, paramNames } = entry;
      const m = regex.exec(req.path);
      if (!m) continue;

      if (
        route.match.methods &&
        !route.match.methods.includes(req.method)
      ) continue;

      if (!matchesHeaders(route.match.headers, req.headers)) continue;
      if (!matchesQuery(route.match.queryParams, req.query)) continue;

      const pathParams: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        pathParams[name] = m[i + 1] ?? "";
      });

      const rewrittenPath = rewritePath(
        req.path,
        route.stripPrefix,
        route.addPrefix
      );

      return { route, rewrittenPath, pathParams: Object.freeze(pathParams) };
    }
    return null;
  }

  /** Return all registered routes (immutable snapshot). */
  list(): ReadonlyArray<Route> {
    return this.routes;
  }
}
