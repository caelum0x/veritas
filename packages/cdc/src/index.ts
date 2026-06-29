// index.ts: public surface of the @veritas/cdc change-data-capture module
export {
  type CdcOperation,
  type CdcEventId,
  type CdcEvent,
  CdcEventSchema,
  newCdcEventId,
  makeCdcEvent,
  serializeCdcEvent,
} from "./change-event.js";

export {
  type CdcCursor,
  CdcCursorSchema,
  type CursorStore,
  InMemoryCursorStore,
  makeCursor,
  advanceCursor,
  compareCursors,
} from "./cursor.js";

export {
  type ChangeStream,
  type StreamSubscribeOptions,
  type StreamBatch,
  InMemoryChangeStream,
} from "./stream.js";

export {
  type RawChange,
  type CaptureOptions,
  type CaptureResult,
  ChangeCapturer,
} from "./capture.js";

export {
  type OutboxFetcher,
  type OutboxRelayConfig,
  type RelayTickResult,
  OutboxRelay,
} from "./outbox-relay.js";

export {
  type ChangePublisher,
  type PublisherOptions,
  createChangePublisher,
} from "./publisher.js";

export {
  type CdcEventHandler,
  type SubscriberOptions,
  type ChangeSubscriber,
  createChangeSubscriber,
} from "./subscriber.js";

export {
  type EventTransformer,
  type AsyncEventTransformer,
  safeTransform,
  composeTransformers,
  transformAll,
  filterByTable,
  filterByOperation,
  extractAfter,
} from "./transform.js";

export {
  type DedupeStore,
  type DedupeKeyFn,
  InMemoryDedupeStore,
  defaultDedupeKey,
  createDedupe,
  dedupeEvents,
} from "./dedupe.js";

export {
  type ProjectionState,
  type ProjectionHandlers,
  type Projection,
  pkKey,
  createProjection,
} from "./projection.js";

export {
  type CdcErrorCode,
  CdcError,
  cdcError,
  isCdcError,
} from "./errors.js";

export {
  type ChangeEvent,
  type InsertEvent,
  type UpdateEvent,
  type DeleteEvent,
  type TruncateEvent,
  type CdcEventHandlerFn,
  type CdcFilter,
  tableFilter,
  operationFilter,
  allFilters,
  anyFilter,
  isInsertEvent,
  isUpdateEvent,
  isDeleteEvent,
  isTruncateEvent,
} from "./types.js";
