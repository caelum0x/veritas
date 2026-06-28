// Bus middleware pipeline: compose interceptors around message publish and handle operations.
import type { Result } from "@veritas/core";
import type { Message, MessageInit } from "./message.js";
import type { MessagingError } from "./errors.js";

export type NextPublish<TPayload> = (
  init: MessageInit<TPayload>,
) => Promise<Result<Message<TPayload>, MessagingError>>;

export type NextHandle<TPayload> = (
  message: Message<TPayload>,
) => Promise<Result<void, MessagingError>>;

export interface PublishMiddleware {
  onPublish<TPayload>(
    init: MessageInit<TPayload>,
    next: NextPublish<TPayload>,
  ): Promise<Result<Message<TPayload>, MessagingError>>;
}

export interface HandleMiddleware {
  onHandle<TPayload>(
    message: Message<TPayload>,
    next: NextHandle<TPayload>,
  ): Promise<Result<void, MessagingError>>;
}

export type BusMiddleware = PublishMiddleware | HandleMiddleware;

/** Compose an ordered array of PublishMiddleware around a terminal publish function. */
export function composePublish<TPayload>(
  middlewares: readonly PublishMiddleware[],
  terminal: NextPublish<TPayload>,
): NextPublish<TPayload> {
  return middlewares.reduceRight<NextPublish<TPayload>>(
    (next, mw) =>
      (init) =>
        mw.onPublish(init, next),
    terminal,
  );
}

/** Compose an ordered array of HandleMiddleware around a terminal handle function. */
export function composeHandle<TPayload>(
  middlewares: readonly HandleMiddleware[],
  terminal: NextHandle<TPayload>,
): NextHandle<TPayload> {
  return middlewares.reduceRight<NextHandle<TPayload>>(
    (next, mw) =>
      (message) =>
        mw.onHandle(message, next),
    terminal,
  );
}

/** Type guard to check if a middleware implements PublishMiddleware. */
export function isPublishMiddleware(mw: BusMiddleware): mw is PublishMiddleware {
  return typeof (mw as PublishMiddleware).onPublish === "function";
}

/** Type guard to check if a middleware implements HandleMiddleware. */
export function isHandleMiddleware(mw: BusMiddleware): mw is HandleMiddleware {
  return typeof (mw as HandleMiddleware).onHandle === "function";
}

/** Logging middleware: logs publish and handle calls via a simple log function. */
export class LoggingMiddleware implements PublishMiddleware, HandleMiddleware {
  constructor(
    private readonly log: (event: string, data: Record<string, unknown>) => void,
  ) {}

  async onPublish<TPayload>(
    init: MessageInit<TPayload>,
    next: NextPublish<TPayload>,
  ): Promise<Result<Message<TPayload>, MessagingError>> {
    this.log("publish.before", { topic: init.topic });
    const result = await next(init);
    this.log("publish.after", { topic: init.topic, ok: result.ok });
    return result;
  }

  async onHandle<TPayload>(
    message: Message<TPayload>,
    next: NextHandle<TPayload>,
  ): Promise<Result<void, MessagingError>> {
    this.log("handle.before", { topic: message.topic, id: message.id });
    const result = await next(message);
    this.log("handle.after", { topic: message.topic, id: message.id, ok: result.ok });
    return result;
  }
}
