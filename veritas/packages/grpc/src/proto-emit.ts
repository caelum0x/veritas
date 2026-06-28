// Emit a .proto file string from service/message descriptors (no codegen tools, pure string generation)
import type { ServiceDescriptor } from './service.js';
import type { MessageDescriptor, FieldDescriptor } from './message.js';
import type { MethodDescriptor } from './method.js';

function indent(n: number): string {
  return '  '.repeat(n);
}

function emitFieldCardinality(f: FieldDescriptor): string {
  if (f.cardinality === 'repeated') return 'repeated ';
  if (f.cardinality === 'required') return 'required ';
  return '';
}

function emitFieldType(f: FieldDescriptor): string {
  if (f.kind === 'message' || f.kind === 'enum') {
    return f.typeName ?? 'bytes';
  }
  return f.kind;
}

function emitField(f: FieldDescriptor, depth: number): string {
  const card = emitFieldCardinality(f);
  const type = emitFieldType(f);
  return `${indent(depth)}${card}${type} ${f.name} = ${f.number};`;
}

function emitMessage(m: MessageDescriptor, depth: number): string {
  const lines: string[] = [];
  lines.push(`${indent(depth)}message ${m.name} {`);
  for (const f of m.fields) {
    lines.push(emitField(f, depth + 1));
  }
  if (m.nested) {
    for (const nested of m.nested) {
      lines.push(emitMessage(nested, depth + 1));
    }
  }
  lines.push(`${indent(depth)}}`);
  return lines.join('\n');
}

function streamPrefix(m: MethodDescriptor): { input: string; output: string } {
  return {
    input: m.streaming === 'client' || m.streaming === 'bidi' ? 'stream ' : '',
    output: m.streaming === 'server' || m.streaming === 'bidi' ? 'stream ' : '',
  };
}

function emitMethod(m: MethodDescriptor, depth: number): string {
  const { input, output } = streamPrefix(m);
  return `${indent(depth)}rpc ${m.name} (${input}${m.inputType}) returns (${output}${m.outputType});`;
}

export function emitProto(svc: ServiceDescriptor): string {
  const lines: string[] = [];
  lines.push('syntax = "proto3";');
  lines.push('');
  if (svc.pkg) {
    lines.push(`package ${svc.pkg};`);
    lines.push('');
  }
  for (const msg of svc.messages) {
    lines.push(emitMessage(msg, 0));
    lines.push('');
  }
  lines.push(`service ${svc.name} {`);
  for (const method of svc.methods) {
    lines.push(emitMethod(method, 1));
  }
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

export function emitProtoMulti(services: ReadonlyArray<ServiceDescriptor>): string {
  return services.map(emitProto).join('\n// ---\n\n');
}
