export const SESSION_STATUS = {
  open: "open",
  ready: "ready",
  cancelled: "cancelled",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const SESSION_ROLE = {
  host: "host",
  guest: "guest",
} as const;

export type SessionRole = (typeof SESSION_ROLE)[keyof typeof SESSION_ROLE];

export const SESSION_EVENT_TYPE = {
  state: "session_state",
  ready: "session_ready",
  cancelled: "session_cancelled",
} as const;

export type SessionEventType = (typeof SESSION_EVENT_TYPE)[keyof typeof SESSION_EVENT_TYPE];

export interface PlayerInfo {
  id: string;
  name: string | null;
}

export interface SessionWithPlayers {
  id: string;
  status: SessionStatus;
  player_1_id: string;
  player_2_id: string | null;
  player_1_connected: boolean;
  player_2_connected: boolean;
  reconnect_deadline_at: string | null;
  created_at: string;
  player_1: PlayerInfo;
  player_2: PlayerInfo | null;
}
