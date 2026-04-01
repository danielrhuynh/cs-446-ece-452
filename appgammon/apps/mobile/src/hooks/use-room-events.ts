import { useCallback, useState } from "react";
import { type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import {
  MATCH_EVENT_TYPE,
  MatchState,
  RoomEventType,
  SESSION_EVENT_TYPE,
  SessionWithPlayers,
  type MatchEventType,
  type SessionEventType,
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
        case SESSION_EVENT_TYPE.state:
        case SESSION_EVENT_TYPE.ready:
        case SESSION_EVENT_TYPE.cancelled:
          setSession(data as SessionWithPlayers);
          setLastSessionEvent(eventType as SessionEventType);
          break;
        case MATCH_EVENT_TYPE.state:
          setMatchState(data as MatchState);
          setLastMatchEvent(eventType as MatchEventType);
          break;
        case MATCH_EVENT_TYPE.doubleProposed:
          setDoubleProposal(data as DoubleProposal);
          setLastMatchEvent(eventType as MatchEventType);
          break;
        case MATCH_EVENT_TYPE.doubleAccepted:
        case MATCH_EVENT_TYPE.doubleDeclined:
          setDoubleProposal(null);
          setLastMatchEvent(eventType as MatchEventType);
          break;
        case MATCH_EVENT_TYPE.gameOver:
          setGameOverInfo(data as GameOverInfo);
          setLastMatchEvent(eventType as MatchEventType);
          break;
        case MATCH_EVENT_TYPE.matchComplete:
          setMatchCompleteInfo(data as MatchCompleteInfo);
          setLastMatchEvent(eventType as MatchEventType);
          break;
        case MATCH_EVENT_TYPE.emote:
          setLastEmote({
            ...(data as { emoteId: string; fromPlayer: string }),
            timestamp: Date.now(),
          });
          setLastMatchEvent(eventType as MatchEventType);
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
