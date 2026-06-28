// Immutable dense vector type and basic arithmetic operations.

import { brand, unbrand, Brand } from "@veritas/core";

export type Vector = Brand<ReadonlyArray<number>, "Vector">;

export function makeVector(components: ReadonlyArray<number>): Vector {
  if (components.length === 0) {
    throw new RangeError("Vector must have at least one component");
  }
  return brand<ReadonlyArray<number>, "Vector">(Object.freeze([...components]));
}

export function dim(v: Vector): number {
  return unbrand(v).length;
}

export function at(v: Vector, i: number): number {
  const arr = unbrand(v);
  if (i < 0 || i >= arr.length) throw new RangeError(`Index ${i} out of bounds`);
  return arr[i]!;
}

export function toArray(v: Vector): ReadonlyArray<number> {
  return unbrand(v);
}

export function add(a: Vector, b: Vector): Vector {
  const aa = unbrand(a);
  const ba = unbrand(b);
  if (aa.length !== ba.length) throw new RangeError("Vector dimension mismatch");
  return makeVector(aa.map((x, i) => x + ba[i]!));
}

export function scale(v: Vector, scalar: number): Vector {
  return makeVector(unbrand(v).map((x) => x * scalar));
}

export function magnitude(v: Vector): number {
  return Math.sqrt(unbrand(v).reduce((acc, x) => acc + x * x, 0));
}

export function normalize(v: Vector): Vector {
  const mag = magnitude(v);
  if (mag === 0) throw new RangeError("Cannot normalize a zero vector");
  return scale(v, 1 / mag);
}

export function dot(a: Vector, b: Vector): number {
  const aa = unbrand(a);
  const ba = unbrand(b);
  if (aa.length !== ba.length) throw new RangeError("Vector dimension mismatch");
  return aa.reduce((acc, x, i) => acc + x * ba[i]!, 0);
}
