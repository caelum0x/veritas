// Type stubs for packages that are not yet installed but are referenced in source files.
// These provide minimal type shapes sufficient to satisfy the TypeScript compiler.

declare module "cookie-parser" {
  import type { RequestHandler } from "express";
  function cookieParser(
    secret?: string | string[],
    options?: Record<string, unknown>,
  ): RequestHandler;
  export = cookieParser;
}

declare module "hono" {
  export interface Env {
    Variables?: Record<string, unknown>;
  }

  export type BlankEnv = Record<string, never>;

  export interface HonoRequest {
    readonly method: string;
    readonly url: string;
    readonly path: string;
    header(name: string): string | undefined;
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
  }

  export interface Context<E extends Env = BlankEnv> {
    readonly req: HonoRequest;
    set<K extends keyof (E["Variables"] extends Record<string, unknown> ? E["Variables"] : Record<string, unknown>)>(
      key: K,
      value: (E["Variables"] extends Record<string, unknown> ? E["Variables"] : Record<string, unknown>)[K],
    ): void;
    get<K extends string>(key: K): unknown;
    json(data: unknown, status?: number): Response;
  }

  export type Next = () => Promise<void>;

  export type MiddlewareHandler<E extends Env = BlankEnv> = (
    c: Context<E>,
    next: Next,
  ) => Promise<Response | void>;
}

declare module "hono/cookie" {
  import type { Context } from "hono";

  export interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    maxAge?: number;
    path?: string;
    domain?: string;
    expires?: Date;
  }

  export function getCookie(c: Context, name: string): string | undefined;
  export function setCookie(c: Context, name: string, value: string, options?: CookieOptions): void;
  export function deleteCookie(c: Context, name: string, options?: CookieOptions): void;
}
