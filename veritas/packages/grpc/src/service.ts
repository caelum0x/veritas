// gRPC service descriptor — defines a named service with its methods and messages
import type { MethodDescriptor } from './method.js';
import type { MessageDescriptor } from './message.js';

export interface ServiceDescriptor {
  readonly name: string;
  readonly pkg: string;
  readonly methods: ReadonlyArray<MethodDescriptor>;
  readonly messages: ReadonlyArray<MessageDescriptor>;
  readonly options?: Readonly<Record<string, string>>;
}

export function defineService(
  pkg: string,
  name: string,
  methods: ReadonlyArray<MethodDescriptor>,
  messages: ReadonlyArray<MessageDescriptor>,
  options?: Readonly<Record<string, string>>,
): ServiceDescriptor {
  return Object.freeze({ pkg, name, methods, messages, options });
}

export function fullyQualifiedName(svc: ServiceDescriptor): string {
  return svc.pkg ? `${svc.pkg}.${svc.name}` : svc.name;
}
