import type { MatchEventType } from "./game";

export enum session_status {
  open = "open",
  ready = "ready",
  cancelled = "cancelled",
}

export type SessionRole = "host" | "guest";

export type SessionEventType = "session_state" | "session_ready" | "session_cancelled";
export type RoomEventType = SessionEventType | MatchEventType;

export interface PlayerInfo {
  id: string;
  name: string | null;
}

export interface SessionWithPlayers {
  id: string;
  status: session_status;
  player_1_id: string;
  player_2_id: string | null;
  player_1_connected: boolean;
  player_2_connected: boolean;
  reconnect_deadline_at: string | null;
  created_at: string;
  player_1: PlayerInfo;
  player_2: PlayerInfo | null;
}
