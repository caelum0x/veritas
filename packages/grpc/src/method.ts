// gRPC method descriptor — describes a single RPC method's shape and streaming mode
export type StreamingMode = 'unary' | 'server' | 'client' | 'bidi';

export interface MethodDescriptor {
  readonly name: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly streaming: StreamingMode;
  readonly options?: Readonly<Record<string, string>>;
}

export function defineMethod(
  name: string,
  inputType: string,
  outputType: string,
  streaming: StreamingMode = 'unary',
  options?: Readonly<Record<string, string>>,
): MethodDescriptor {
  return Object.freeze({ name, inputType, outputType, streaming, options });
}

export function isClientStreaming(m: MethodDescriptor): boolean {
  return m.streaming === 'client' || m.streaming === 'bidi';
}

export function isServerStreaming(m: MethodDescriptor): boolean {
  return m.streaming === 'server' || m.streaming === 'bidi';
}
