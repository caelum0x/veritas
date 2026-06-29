// String emitter: accumulates lines of generated source code with indentation support.

export class Emitter {
  private readonly lines: string[] = [];
  private indentLevel = 0;
  private readonly indentUnit: string;

  constructor(indentUnit = "  ") {
    this.indentUnit = indentUnit;
  }

  /** Emit a blank line. */
  blank(): this {
    this.lines.push("");
    return this;
  }

  /** Emit one or more lines at the current indent level. */
  line(text = ""): this {
    if (text === "") {
      this.lines.push("");
    } else {
      const prefix = this.indentUnit.repeat(this.indentLevel);
      for (const row of text.split("\n")) {
        this.lines.push(`${prefix}${row}`);
      }
    }
    return this;
  }

  /** Emit a line then increase indent for subsequent lines. */
  open(text: string): this {
    this.line(text);
    this.indent();
    return this;
  }

  /** Decrease indent then emit a closing line. */
  close(text: string): this {
    this.dedent();
    this.line(text);
    return this;
  }

  /** Increase the current indent level by one. */
  indent(): this {
    this.indentLevel += 1;
    return this;
  }

  /** Decrease the current indent level by one (minimum 0). */
  dedent(): this {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
    return this;
  }

  /** Execute a callback at an increased indent level. */
  indented(fn: () => void): this {
    this.indent();
    fn();
    this.dedent();
    return this;
  }

  /** Emit a block: open line, indented body callback, close line. */
  block(open: string, close: string, fn: () => void): this {
    this.open(open);
    fn();
    this.close(close);
    return this;
  }

  /** Return all emitted lines joined by newline. */
  toString(): string {
    return this.lines.join("\n");
  }

  /** Return the emitted source as a string (alias for toString). */
  flush(): string {
    return this.toString();
  }
}

/** Create a fresh Emitter and run a builder callback, returning the emitted string. */
export function emit(fn: (e: Emitter) => void, indentUnit?: string): string {
  const e = new Emitter(indentUnit);
  fn(e);
  return e.flush();
}
