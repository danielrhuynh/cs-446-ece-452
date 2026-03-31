import { useCallback, useState } from "react";
import { type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import type {
  MatchEventType,
  MatchState,
  RoomEventType,
  SessionEventType,
  SessionWithPlayers,
} from "@appgammon/common";
import { useSSEStream } from "./use-sse-stream";

export interface DoubleProposal {
  cubeValue: number;
  proposedBy: string;
}

export interface GameOverInfo {
  winnerId: string;
  points: number;
  player1Score: number;
  player2Score: number;
}

export interface MatchCompleteInfo {
  winnerId: string;
  player1Score: number;
  player2Score: number;
}

export interface IncomingEmote {
  emoteId: string;
  fromPlayer: string;
  timestamp: number;
}

export function useRoomEvents(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [lastEvent, setLastEvent] = useState<RoomEventType | null>(null);
  const [lastSessionEvent, setLastSessionEvent] = useState<SessionEventType | null>(null);
  const [lastMatchEvent, setLastMatchEvent] = useState<MatchEventType | null>(null);
  const [doubleProposal, setDoubleProposal] = useState<DoubleProposal | null>(null);
  const [lastEmote, setLastEmote] = useState<IncomingEmote | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [matchCompleteInfo, setMatchCompleteInfo] = useState<MatchCompleteInfo | null>(null);

  const resetState = useCallback(() => {
    setSession(null);
    setMatchState(null);
    setLastEvent(null);
    setLastSessionEvent(null);
    setLastMatchEvent(null);
    setDoubleProposal(null);
    setLastEmote(null);
    setGameOverInfo(null);
    setMatchCompleteInfo(null);
  }, []);

  const handleEvent = useCallback((evt: SSEEvent) => {
    const eventType = evt.event as RoomEventType;
    setLastEvent(eventType);

    try {
      const data = JSON.parse(evt.data);

      switch (eventType) {
        case "session_state":
        case "session_ready":
        case "session_cancelled":
          setSession(data as SessionWithPlayers);
          setLastSessionEvent(eventType as SessionEventType);
          break;
        case "match_state":
          setMatchState(data as MatchState);
          setLastMatchEvent(eventType);
          break;
        case "double_proposed":
          setDoubleProposal(data as DoubleProposal);
          setLastMatchEvent(eventType);
          break;
        case "double_accepted":
        case "double_declined":
          setDoubleProposal(null);
          setLastMatchEvent(eventType);
          break;
        case "game_over":
          setGameOverInfo(data as GameOverInfo);
          setLastMatchEvent(eventType);
          break;
        case "match_complete":
          setMatchCompleteInfo(data as MatchCompleteInfo);
          setLastMatchEvent(eventType);
          break;
        case "emote":
          setLastEmote({
            ...(data as { emoteId: string; fromPlayer: string }),
            timestamp: Date.now(),
          });
          setLastMatchEvent(eventType);
          break;
      }
    } catch {
      // Ignore parse errors.
    }
  }, []);

  const isRetryableError = useCallback(
    (error: SSEConnectionError | undefined) => error?.retryable !== false,
    [],
  );

  useSSEStream({
    enabled: !!sessionId,
    path: sessionId ? `/sessions/${sessionId}/events` : "",
    logPrefix: "RoomSSE",
    resetState,
    onEvent: handleEvent,
    isRetryableError,
  });

  return {
    session,
    matchState,
    lastEvent,
    lastSessionEvent,
    lastMatchEvent,
    doubleProposal,
    lastEmote,
    gameOverInfo,
    matchCompleteInfo,
  };
}
