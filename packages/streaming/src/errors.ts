// Streaming-specific error classes extending AppError.
import { AppError } from "@veritas/core";

export class StreamError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
  }
}

export class StreamClosedError extends StreamError {
  constructor(streamId: string) {
    super(`Stream ${streamId} is closed`);
  }
}

export class StreamBackpressureError extends StreamError {
  constructor(streamId: string, bufferSize: number) {
    super(`Stream ${streamId} buffer full (size=${bufferSize})`);
  }
}

export class ProcessorError extends StreamError {
  constructor(processorId: string, message: string, cause?: unknown) {
    super(`Processor ${processorId}: ${message}`, cause);
  }
}

export class WindowError extends StreamError {
  constructor(message: string) {
    super(`Window error: ${message}`);
  }
}

export class JoinError extends StreamError {
  constructor(message: string) {
    super(`Join error: ${message}`);
  }
}

export class WatermarkError extends StreamError {
  constructor(message: string) {
    super(`Watermark error: ${message}`);
  }
}

export class StateError extends StreamError {
  constructor(key: string, message: string) {
    super(`State[${key}]: ${message}`);
  }
}

export class SourceError extends StreamError {
  constructor(sourceId: string, message: string, cause?: unknown) {
    super(`Source ${sourceId}: ${message}`, cause);
  }
}

export class SinkError extends StreamError {
  constructor(sinkId: string, message: string, cause?: unknown) {
    super(`Sink ${sinkId}: ${message}`, cause);
  }
}
