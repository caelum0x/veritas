// Public surface re-export for @veritas/messaging
export * from "./errors.js";
export type {
  Topic,
  MessagePriority,
  DeliverySemantics,
  MessageEnvelope,
  HandlerResult,
  Subscription,
  OutboxRecord,
  DeadLetterRecord,
} from "./types.js";
export { asMessageId, asTopic } from "./types.js";
export * from "./message.js";
export * from "./message-bus.js";
export * from "./in-memory-bus.js";
export * from "./publisher.js";
export * from "./subscriber.js";
export * from "./handler.js";
export * from "./outbox.js";
export * from "./inbox.js";
export * from "./dead-letter.js";
export * from "./retry.js";
export * from "./serializer.js";
export * from "./topic.js";
export * from "./middleware.js";
export type {
  Transport,
  TransportHandler,
  TransportSubscription,
  SendOptions,
  SubscribeOptions as TransportSubscribeOptions,
} from "./transports/transport.js";
export * from "./transports/memory.js";
