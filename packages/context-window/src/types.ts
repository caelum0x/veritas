// Shared types for the context-window package.

export type Role = "system" | "user" | "assistant" | "tool";

export interface Turn {
  readonly id: string;
  readonly role: Role;
  readonly content: string;
  readonly createdAt: number; // epoch ms
  readonly tokenCount?: number;
  readonly priority?: number; // 0–1, higher = more important
  readonly pinned?: boolean;   // never pruned
}

export interface ContextWindow {
  readonly turns: readonly Turn[];
  readonly totalTokens: number;
  readonly budgetTokens: number;
}

export interface PackResult {
  readonly turns: readonly Turn[];
  readonly totalTokens: number;
  readonly dropped: number;
}
