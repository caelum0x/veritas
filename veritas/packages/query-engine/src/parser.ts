// Query parser — converts a simple SQL-like string into a SelectQuery AST.
import { err, ok, type Result } from "@veritas/core";
import {
  type SelectQuery,
  type Predicate,
  type ScalarExpr,
  type ProjectionItem,
  type TableSource,
  type JoinClause,
  type OrderByItem,
  type ComparisonOp,
  type AggFn,
  columnRef,
  literal,
  makeSelect,
} from "./query.js";

/** A token emitted by the lexer. */
interface Token {
  readonly kind: "keyword" | "ident" | "number" | "string" | "op" | "punct" | "eof";
  readonly value: string;
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const kw = new Set([
    "SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","FULL","OUTER","ON",
    "AND","OR","NOT","GROUP","BY","HAVING","ORDER","LIMIT","OFFSET","AS",
    "ASC","DESC","NULL","TRUE","FALSE","IN","LIKE",
    "SUM","COUNT","AVG","MIN","MAX","COUNT_DISTINCT",
  ]);

  while (i < src.length) {
    if (/\s/.test(src[i]!)) { i++; continue; }

    // String literal
    if (src[i] === "'" || src[i] === '"') {
      const quote = src[i++]!;
      let s = "";
      while (i < src.length && src[i] !== quote) s += src[i++];
      i++;
      tokens.push({ kind: "string", value: s });
      continue;
    }

    // Number
    if (/\d/.test(src[i]!)) {
      let n = "";
      while (i < src.length && /[\d.]/.test(src[i]!)) n += src[i++];
      tokens.push({ kind: "number", value: n });
      continue;
    }

    // Identifier / keyword
    if (/[A-Za-z_]/.test(src[i]!)) {
      let id = "";
      while (i < src.length && /[\w]/.test(src[i]!)) id += src[i++];
      const upper = id.toUpperCase();
      tokens.push({ kind: kw.has(upper) ? "keyword" : "ident", value: upper === id ? upper : id });
      continue;
    }

    // Two-char operators
    const two = src.slice(i, i + 2);
    if (["!=","<>","<=",">="].includes(two)) { tokens.push({ kind: "op", value: two }); i += 2; continue; }

    // Single char
    const ch = src[i++]!;
    if ("<>=!".includes(ch)) { tokens.push({ kind: "op", value: ch }); continue; }
    if ("(),.*".includes(ch)) { tokens.push({ kind: "punct", value: ch }); continue; }
  }

  tokens.push({ kind: "eof", value: "" });
  return tokens;
}

class TokenStream {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}
  peek(): Token { return this.tokens[this.pos] ?? { kind: "eof", value: "" }; }
  consume(): Token { return this.tokens[this.pos++] ?? { kind: "eof", value: "" }; }
  expect(value: string): void { const t = this.consume(); if (t.value.toUpperCase() !== value.toUpperCase()) throw new Error(`Expected '${value}', got '${t.value}'`); }
  matchKw(...kws: string[]): boolean { return kws.some(k => this.peek().value.toUpperCase() === k.toUpperCase()); }
}

function parseScalar(ts: TokenStream): ScalarExpr {
  const t = ts.peek();
  const aggFns = ["SUM","COUNT","AVG","MIN","MAX","COUNT_DISTINCT"];

  if (t.kind === "keyword" && aggFns.includes(t.value.toUpperCase())) {
    ts.consume();
    ts.expect("(");
    const inner = ts.peek().value === "*" ? (ts.consume(), literal(1)) : parseScalar(ts);
    ts.expect(")");
    let alias: string | undefined;
    if (ts.matchKw("AS")) { ts.consume(); alias = ts.consume().value; }
    return { kind: "agg", fn: t.value.toUpperCase() as AggFn, column: inner as (ReturnType<typeof columnRef> | ReturnType<typeof literal>), alias };
  }

  if (t.kind === "ident") {
    ts.consume();
    if (ts.peek().value === ".") {
      ts.consume();
      const col = ts.consume().value;
      let alias: string | undefined;
      if (ts.matchKw("AS")) { ts.consume(); alias = ts.consume().value; }
      return { kind: "column", table: t.value, name: col };
    }
    let alias: string | undefined;
    if (ts.matchKw("AS")) { ts.consume(); alias = ts.consume().value; }
    return { kind: "column", name: t.value };
  }

  if (t.kind === "number") { ts.consume(); return literal(parseFloat(t.value)); }
  if (t.kind === "string") { ts.consume(); return literal(t.value); }
  if (t.kind === "keyword" && t.value === "NULL") { ts.consume(); return literal(null); }
  if (t.kind === "keyword" && t.value === "TRUE") { ts.consume(); return literal(true); }
  if (t.kind === "keyword" && t.value === "FALSE") { ts.consume(); return literal(false); }

  throw new Error(`Unexpected token in scalar: ${t.value}`);
}

function mapOp(op: string): ComparisonOp {
  const m: Record<string, ComparisonOp> = {
    "=": "eq", "!=": "neq", "<>": "neq",
    ">": "gt", ">=": "gte", "<": "lt", "<=": "lte",
    "LIKE": "like", "IN": "in",
  };
  const r = m[op.toUpperCase()];
  if (!r) throw new Error(`Unknown operator: ${op}`);
  return r;
}

function parsePredicate(ts: TokenStream): Predicate {
  let left = parseComparisonOrNot(ts);
  while (ts.matchKw("AND", "OR")) {
    const op = ts.consume().value.toLowerCase() as "and" | "or";
    const right = parseComparisonOrNot(ts);
    left = { kind: "logical", op, operands: [left, right] };
  }
  return left;
}

function parseComparisonOrNot(ts: TokenStream): Predicate {
  if (ts.matchKw("NOT")) {
    ts.consume();
    return { kind: "logical", op: "not", operands: [parseComparisonOrNot(ts)] };
  }
  const left = parseScalar(ts);
  const opTok = ts.peek();
  if (opTok.kind === "op" || (opTok.kind === "keyword" && ["LIKE","IN"].includes(opTok.value))) {
    ts.consume();
    const right = parseScalar(ts);
    return { kind: "comparison", left, op: mapOp(opTok.value), right };
  }
  throw new Error(`Expected comparison operator near '${opTok.value}'`);
}

function parseProjections(ts: TokenStream): readonly ProjectionItem[] {
  if (ts.peek().value === "*") { ts.consume(); return [{ expr: columnRef("*") }]; }
  const items: ProjectionItem[] = [];
  do {
    const expr = parseScalar(ts);
    let alias: string | undefined;
    if (ts.matchKw("AS")) { ts.consume(); alias = ts.consume().value; }
    items.push({ expr, alias });
  } while (ts.peek().value === "," && ts.consume());
  return items;
}

function parseTableSource(ts: TokenStream): TableSource {
  const schema = ts.consume().value;
  let name = schema;
  let s = schema;
  if (ts.peek().value === ".") {
    ts.consume();
    name = ts.consume().value;
    s = schema;
  } else {
    s = "public";
    name = schema;
  }
  let alias: string | undefined;
  if (ts.matchKw("AS")) { ts.consume(); alias = ts.consume().value; }
  return { schema: s, name, ...(alias ? { alias } : {}) };
}

function parseJoins(ts: TokenStream): readonly JoinClause[] {
  const joins: JoinClause[] = [];
  const joinKws = ["JOIN","INNER","LEFT","RIGHT","FULL"];
  while (joinKws.some(k => ts.matchKw(k))) {
    let joinType: "inner" | "left" | "right" | "full" = "inner";
    const first = ts.consume().value.toUpperCase();
    if (first === "LEFT") { joinType = "left"; if (ts.matchKw("OUTER")) ts.consume(); ts.expect("JOIN"); }
    else if (first === "RIGHT") { joinType = "right"; if (ts.matchKw("OUTER")) ts.consume(); ts.expect("JOIN"); }
    else if (first === "FULL") { joinType = "full"; if (ts.matchKw("OUTER")) ts.consume(); ts.expect("JOIN"); }
    else if (first === "INNER") { ts.expect("JOIN"); }
    const right = parseTableSource(ts);
    ts.expect("ON");
    const on = parsePredicate(ts);
    joins.push({ kind: "join", joinType, right, on });
  }
  return joins;
}

/** Parse a SQL-like SELECT statement into a SelectQuery AST. */
export function parseQuery(sql: string): Result<SelectQuery> {
  try {
    const ts = new TokenStream(tokenize(sql));
    ts.expect("SELECT");

    const projections = parseProjections(ts);
    ts.expect("FROM");
    const from = parseTableSource(ts);
    const joins = parseJoins(ts);

    let where: Predicate | undefined;
    if (ts.matchKw("WHERE")) { ts.consume(); where = parsePredicate(ts); }

    const groupBy: ReturnType<typeof columnRef>[] = [];
    if (ts.matchKw("GROUP")) {
      ts.consume(); ts.expect("BY");
      do { groupBy.push(columnRef(ts.consume().value)); } while (ts.peek().value === "," && ts.consume());
    }

    let having: Predicate | undefined;
    if (ts.matchKw("HAVING")) { ts.consume(); having = parsePredicate(ts); }

    const orderBy: OrderByItem[] = [];
    if (ts.matchKw("ORDER")) {
      ts.consume(); ts.expect("BY");
      do {
        const expr = parseScalar(ts);
        const dir = ts.matchKw("DESC") ? (ts.consume(), "desc" as const) : (ts.matchKw("ASC") && ts.consume(), "asc" as const);
        orderBy.push({ expr, dir });
      } while (ts.peek().value === "," && ts.consume());
    }

    let limit: number | undefined;
    if (ts.matchKw("LIMIT")) { ts.consume(); limit = parseInt(ts.consume().value, 10); }

    let offset: number | undefined;
    if (ts.matchKw("OFFSET")) { ts.consume(); offset = parseInt(ts.consume().value, 10); }

    const q: SelectQuery = { ...makeSelect(from), joins, projections, where, groupBy, having, orderBy, limit, offset };
    return ok(q);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
