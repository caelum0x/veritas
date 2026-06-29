// DSL parser: converts simple text rule expressions into Condition trees.
import type { Condition } from './condition.js';
import {
  fieldEq,
  fieldNeq,
  fieldGt,
  fieldGte,
  fieldLt,
  fieldLte,
  fieldIn,
  fieldContains,
  and,
  or,
  not,
  always,
  never,
} from './condition.js';

export type ParseResult =
  | { readonly ok: true; readonly condition: Condition }
  | { readonly ok: false; readonly error: string };

/**
 * Tiny rule DSL grammar (case-insensitive keywords):
 *   expr  := or_expr
 *   or    := and (' OR ' and)*
 *   and   := not (' AND ' not)*
 *   not   := 'NOT ' not | atom
 *   atom  := '(' expr ')' | comparison | 'true' | 'false'
 *   comp  := field ' ' op ' ' value
 *   field := [subject|resource|env].<name>  or bare <name>
 *   op    := '==' | '!=' | '<' | '<=' | '>' | '>='  | 'in' | 'contains'
 *   value := '"string"' | number | 'true' | 'false'
 */

interface Token {
  kind: 'WORD' | 'OP' | 'LPAREN' | 'RPAREN' | 'STRING' | 'NUMBER';
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = input.trim();

  while (i < src.length) {
    if (src[i] === ' ' || src[i] === '\t') { i++; continue; }
    if (src[i] === '(') { tokens.push({ kind: 'LPAREN', value: '(' }); i++; continue; }
    if (src[i] === ')') { tokens.push({ kind: 'RPAREN', value: ')' }); i++; continue; }
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      tokens.push({ kind: 'STRING', value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/\d/.test(src[i] ?? '') || (src[i] === '-' && /\d/.test(src[i + 1] ?? ''))) {
      let j = i;
      if (src[j] === '-') j++;
      while (j < src.length && /[\d.]/.test(src[j] ?? '')) j++;
      tokens.push({ kind: 'NUMBER', value: src.slice(i, j) });
      i = j;
      continue;
    }
    const ops = ['<=', '>=', '==', '!=', '<', '>'];
    const matched = ops.find((op) => src.startsWith(op, i));
    if (matched !== undefined) {
      tokens.push({ kind: 'OP', value: matched });
      i += matched.length;
      continue;
    }
    let j = i;
    while (j < src.length && !/[ \t()]/.test(src[j] ?? '')) j++;
    tokens.push({ kind: 'WORD', value: src.slice(i, j) });
    i = j;
  }
  return tokens;
}

interface ParserState {
  tokens: Token[];
  pos: number;
}

function peek(s: ParserState): Token | undefined {
  return s.tokens[s.pos];
}

function consume(s: ParserState): Token {
  const t = s.tokens[s.pos];
  if (t === undefined) throw new Error('Unexpected end of input');
  s.pos++;
  return t;
}

function parseExpr(s: ParserState): Condition {
  return parseOr(s);
}

function parseOr(s: ParserState): Condition {
  const left = parseAnd(s);
  const rights: Condition[] = [left];
  while (peek(s)?.kind === 'WORD' && peek(s)?.value.toUpperCase() === 'OR') {
    consume(s);
    rights.push(parseAnd(s));
  }
  return rights.length === 1 ? (rights[0] as Condition) : or(...rights);
}

function parseAnd(s: ParserState): Condition {
  const left = parseNot(s);
  const rights: Condition[] = [left];
  while (peek(s)?.kind === 'WORD' && peek(s)?.value.toUpperCase() === 'AND') {
    consume(s);
    rights.push(parseNot(s));
  }
  return rights.length === 1 ? (rights[0] as Condition) : and(...rights);
}

function parseNot(s: ParserState): Condition {
  if (peek(s)?.kind === 'WORD' && peek(s)?.value.toUpperCase() === 'NOT') {
    consume(s);
    return not(parseNot(s));
  }
  return parseAtom(s);
}

function parseAtom(s: ParserState): Condition {
  const t = peek(s);
  if (t === undefined) throw new Error('Expected condition, got end of input');

  if (t.kind === 'LPAREN') {
    consume(s);
    const inner = parseExpr(s);
    const closing = consume(s);
    if (closing.kind !== 'RPAREN') throw new Error('Expected closing parenthesis');
    return inner;
  }

  if (t.kind === 'WORD' && t.value.toLowerCase() === 'true') {
    consume(s);
    return always;
  }
  if (t.kind === 'WORD' && t.value.toLowerCase() === 'false') {
    consume(s);
    return never;
  }

  return parseComparison(s);
}

function resolveField(raw: string): { scope: 'subject' | 'resource' | 'env'; key: string } {
  if (raw.startsWith('subject.')) return { scope: 'subject', key: raw.slice(8) };
  if (raw.startsWith('resource.')) return { scope: 'resource', key: raw.slice(9) };
  if (raw.startsWith('env.')) return { scope: 'env', key: raw.slice(4) };
  return { scope: 'subject', key: raw };
}

function parseComparison(s: ParserState): Condition {
  const fieldToken = consume(s);
  if (fieldToken.kind !== 'WORD') throw new Error(`Expected field name, got ${fieldToken.value}`);

  const opToken = peek(s);
  if (opToken === undefined) throw new Error('Expected operator after field');

  const opValue = opToken.value.toLowerCase();
  const isInlineOp = opToken.kind === 'OP' || (opToken.kind === 'WORD' && (opValue === 'in' || opValue === 'contains'));
  if (!isInlineOp) throw new Error(`Expected operator, got ${opToken.value}`);
  consume(s);

  const valueToken = consume(s);
  const value = parseValue(valueToken);
  const { scope, key } = resolveField(fieldToken.value);

  const opStr = opToken.value.toLowerCase();
  const qualifiedField = `${scope}.${key}`;
  if (opStr === '==' || opStr === 'in') {
    return fieldEq(qualifiedField, value);
  }
  if (opStr === '!=') {
    return fieldNeq(qualifiedField, value);
  }
  if (opStr === '>') {
    return fieldGt(qualifiedField, typeof value === 'number' ? value : Number(value));
  }
  if (opStr === '>=') {
    return fieldGte(qualifiedField, typeof value === 'number' ? value : Number(value));
  }
  if (opStr === '<') {
    return fieldLt(qualifiedField, typeof value === 'number' ? value : Number(value));
  }
  if (opStr === '<=') {
    return fieldLte(qualifiedField, typeof value === 'number' ? value : Number(value));
  }
  if (opStr === 'contains') {
    return fieldContains(qualifiedField, String(value));
  }
  return fieldIn(qualifiedField, [value]);
}

function parseValue(t: Token): string | number | boolean {
  if (t.kind === 'STRING') return t.value;
  if (t.kind === 'NUMBER') return Number(t.value);
  if (t.kind === 'WORD') {
    if (t.value.toLowerCase() === 'true') return true;
    if (t.value.toLowerCase() === 'false') return false;
    return t.value;
  }
  throw new Error(`Unexpected value token: ${t.value}`);
}

export function parseDsl(expression: string): ParseResult {
  try {
    const tokens = tokenize(expression);
    const state: ParserState = { tokens, pos: 0 };
    const condition = parseExpr(state);
    if (state.pos !== tokens.length) {
      return { ok: false, error: `Unexpected token: ${tokens[state.pos]?.value ?? ''}` };
    }
    return { ok: true, condition };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
