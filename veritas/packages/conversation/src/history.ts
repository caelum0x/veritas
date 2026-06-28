// History management: windowed retrieval and formatting of conversation turns
import type { Conversation } from "./conversation.js";
import type { Turn } from "./turn.js";
import type { MessageRole } from "./types.js";

export interface HistoryWindow {
  readonly turns: ReadonlyArray<Turn>;
  readonly totalTurns: number;
  readonly truncated: boolean;
}

export interface HistoryOptions {
  /** Maximum number of recent turns to include */
  readonly maxTurns?: number;
  /** Only include turns with these roles */
  readonly roles?: ReadonlyArray<MessageRole>;
  /** Maximum total characters across all turn content */
  readonly maxChars?: number;
}

export function getHistory(
  conversation: Readonly<Conversation>,
  options: HistoryOptions = {},
): HistoryWindow {
  const { maxTurns, roles, maxChars } = options;
  const allTurns = conversation.turns;
  const totalTurns = allTurns.length;

  let filtered: ReadonlyArray<Turn> = roles
    ? allTurns.filter((t) => roles.includes(t.role))
    : allTurns;

  if (maxTurns !== undefined && filtered.length > maxTurns) {
    filtered = filtered.slice(filtered.length - maxTurns);
  }

  if (maxChars !== undefined) {
    filtered = trimToCharBudget(filtered, maxChars);
  }

  return {
    turns: filtered,
    totalTurns,
    truncated: filtered.length < totalTurns,
  };
}

function trimToCharBudget(turns: ReadonlyArray<Turn>, budget: number): ReadonlyArray<Turn> {
  let remaining = budget;
  const result: Turn[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (remaining <= 0) break;
    const turn = turns[i];
    if (turn === undefined) continue;
    remaining -= turn.content.length;
    result.unshift(turn);
  }
  return result;
}

export function getLastTurn(conversation: Readonly<Conversation>): Turn | null {
  const turns = conversation.turns;
  return turns.length > 0 ? (turns[turns.length - 1] ?? null) : null;
}

export function getLastAssistantTurn(conversation: Readonly<Conversation>): Turn | null {
  const turns = conversation.turns;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn !== undefined && turn.role === "assistant") return turn;
  }
  return null;
}

export function getLastUserTurn(conversation: Readonly<Conversation>): Turn | null {
  const turns = conversation.turns;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn !== undefined && turn.role === "user") return turn;
  }
  return null;
}

export function buildApiMessages(
  conversation: Readonly<Conversation>,
  options: HistoryOptions = {},
): ReadonlyArray<{ role: MessageRole; content: string }> {
  const { turns } = getHistory(conversation, options);
  return turns.map((t) => ({ role: t.role, content: t.content }));
}
