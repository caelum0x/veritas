// gRPC message descriptor — describes a protobuf message with its fields
export type FieldKind =
  | 'string'
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'float'
  | 'double'
  | 'bool'
  | 'bytes'
  | 'message'
  | 'enum';

export type FieldCardinality = 'optional' | 'required' | 'repeated';

export interface FieldDescriptor {
  readonly name: string;
  readonly number: number;
  readonly kind: FieldKind;
  readonly typeName?: string; // for kind='message'|'enum'
  readonly cardinality: FieldCardinality;
  readonly options?: Readonly<Record<string, string>>;
}

export interface MessageDescriptor {
  readonly name: string;
  readonly fields: ReadonlyArray<FieldDescriptor>;
  readonly nested?: ReadonlyArray<MessageDescriptor>;
  readonly options?: Readonly<Record<string, string>>;
}

export function defineMessage(
  name: string,
  fields: ReadonlyArray<FieldDescriptor>,
  nested?: ReadonlyArray<MessageDescriptor>,
  options?: Readonly<Record<string, string>>,
): MessageDescriptor {
  return Object.freeze({ name, fields, nested, options });
}

export function defineField(
  name: string,
  number: number,
  kind: FieldKind,
  cardinality: FieldCardinality = 'optional',
  typeName?: string,
  options?: Readonly<Record<string, string>>,
): FieldDescriptor {
  return Object.freeze({ name, number, kind, cardinality, typeName, options });
}
