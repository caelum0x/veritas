// result-pipe: compose a sequence of Result-returning async steps with short-circuit on Err.

import { type Result, isErr, flatMap } from "@veritas/core";

type AsyncStep<A, B, E> = (input: A) => Promise<Result<B, E>>;

/**
 * pipe2 — thread a value through two Result-returning async steps.
 * Returns the first Err encountered, otherwise the final Ok.
 */
export async function pipe2<A, B, C, E>(
  input: A,
  step1: AsyncStep<A, B, E>,
  step2: AsyncStep<B, C, E>,
): Promise<Result<C, E>> {
  const r1 = await step1(input);
  if (isErr(r1)) return r1;
  return step2(r1.value);
}

/**
 * pipe3 — thread a value through three Result-returning async steps.
 */
export async function pipe3<A, B, C, D, E>(
  input: A,
  step1: AsyncStep<A, B, E>,
  step2: AsyncStep<B, C, E>,
  step3: AsyncStep<C, D, E>,
): Promise<Result<D, E>> {
  const r1 = await step1(input);
  if (isErr(r1)) return r1;
  const r2 = await step2(r1.value);
  if (isErr(r2)) return r2;
  return step3(r2.value);
}

/**
 * pipe4 — thread a value through four Result-returning async steps.
 */
export async function pipe4<A, B, C, D, F, E>(
  input: A,
  step1: AsyncStep<A, B, E>,
  step2: AsyncStep<B, C, E>,
  step3: AsyncStep<C, D, E>,
  step4: AsyncStep<D, F, E>,
): Promise<Result<F, E>> {
  const r1 = await step1(input);
  if (isErr(r1)) return r1;
  const r2 = await step2(r1.value);
  if (isErr(r2)) return r2;
  const r3 = await step3(r2.value);
  if (isErr(r3)) return r3;
  return step4(r3.value);
}

/**
 * pipeN — thread a value through an ordered list of homogeneous steps.
 * All steps must share the same input/output type T.
 */
export async function pipeN<T, E>(
  input: T,
  steps: ReadonlyArray<AsyncStep<T, T, E>>,
): Promise<Result<T, E>> {
  let current: Result<T, E> = { ok: true, value: input } as Result<T, E>;
  for (const step of steps) {
    if (isErr(current)) return current;
    current = await step(current.value);
  }
  return current;
}

/** Lift a sync Result-returning function into an async step. */
export function liftSync<A, B, E>(
  fn: (input: A) => Result<B, E>,
): AsyncStep<A, B, E> {
  return (input) => Promise.resolve(fn(input));
}

/** Tap into the pipeline for side effects without altering the value. */
export function tapStep<A, E>(
  fn: (value: A) => void | Promise<void>,
): AsyncStep<A, A, E> {
  return async (input) => {
    await fn(input);
    return { ok: true, value: input } as Result<A, E>;
  };
}
