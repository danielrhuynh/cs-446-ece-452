// ── Session types ──

export enum session_status {
  open = "open",
  closed = "closed",
  in_game = "in_game",
  cancelled = "cancelled",
}

export type SessionEventType = "session_state" | "player_joined" | "game_started" | "session_cancelled";

export interface PlayerInfo {
  id: string;
  name: string | null;
}

export interface SessionWithPlayers {
  id: string;
  status: string;
  player_1_id: string;
  player_2_id: string | null;
  created_at: string;
  player_1: PlayerInfo;
  player_2: PlayerInfo | null;
}

// ── Game engine ──

export * from "./game-types";
export * from "./dice";
export * from "./board";
export * from "./move-validation";
export * from "./turn-validation";
export * from "./win-detection";
