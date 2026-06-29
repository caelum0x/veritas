// Small immutable tuple helpers.

/** A 2-tuple. */
export type Pair<A, B> = readonly [A, B];

/** A 3-tuple. */
export type Triple<A, B, C> = readonly [A, B, C];

/** Build a pair. */
export function pair<A, B>(a: A, b: B): Pair<A, B> {
  return [a, b];
}

/** Build a triple. */
export function triple<A, B, C>(a: A, b: B, c: C): Triple<A, B, C> {
  return [a, b, c];
}

/** First element of a pair. */
export function fst<A, B>(p: Pair<A, B>): A {
  return p[0];
}

/** Second element of a pair. */
export function snd<A, B>(p: Pair<A, B>): B {
  return p[1];
}

/** Swap the elements of a pair, returning a new pair. */
export function swap<A, B>(p: Pair<A, B>): Pair<B, A> {
  return [p[1], p[0]];
}
