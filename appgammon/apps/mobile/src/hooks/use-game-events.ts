import { useCallback, useState } from "react";
import { type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import type { GameEventType, SeriesState } from "@appgammon/common";
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

export interface SeriesCompleteInfo {
  winnerId: string;
  player1Score: number;
  player2Score: number;
}

export interface IncomingEmote {
  emoteId: string;
  fromPlayer: string;
  timestamp: number;
}

export function useGameEvents(sessionId: string | undefined) {
  const [seriesState, setSeriesState] = useState<SeriesState | null>(null);
  const [lastEvent, setLastEvent] = useState<GameEventType | null>(null);
  const [doubleProposal, setDoubleProposal] = useState<DoubleProposal | null>(null);
  const [lastEmote, setLastEmote] = useState<IncomingEmote | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [seriesCompleteInfo, setSeriesCompleteInfo] = useState<SeriesCompleteInfo | null>(null);

  const clearDoubleProposal = useCallback(() => setDoubleProposal(null), []);

  const resetState = useCallback(() => {
    setSeriesState(null);
    setLastEvent(null);
    setDoubleProposal(null);
    setLastEmote(null);
    setGameOverInfo(null);
    setSeriesCompleteInfo(null);
  }, []);

  const handleEvent = useCallback((evt: SSEEvent) => {
    const eventType = evt.event as GameEventType;
    setLastEvent(eventType);

    try {
      const data = JSON.parse(evt.data);

      switch (eventType) {
        case "game_state":
          setSeriesState(data as SeriesState);
          break;
        case "double_proposed":
          setDoubleProposal(data as DoubleProposal);
          break;
        case "double_accepted":
        case "double_declined":
          setDoubleProposal(null);
          break;
        case "game_over":
          setGameOverInfo(data as GameOverInfo);
          break;
        case "series_complete":
          setSeriesCompleteInfo(data as SeriesCompleteInfo);
          break;
        case "emote":
          setLastEmote({
            ...(data as { emoteId: string; fromPlayer: string }),
            timestamp: Date.now(),
          });
          break;
      }
    } catch {
      // Ignore parse errors.
    }
  }, []);

  const isRetryableError = useCallback(
    (error: SSEConnectionError | undefined, rawError: unknown) =>
      error?.status === 404 ||
      (typeof rawError === "object" &&
      rawError !== null &&
      "retryable" in rawError &&
      typeof error?.retryable === "boolean"
        ? error.retryable
        : true),
    [],
  );

  useSSEStream({
    enabled: !!sessionId,
    path: sessionId ? `/games/${sessionId}/events` : "",
    logPrefix: "GameSSE",
    resetState,
    onEvent: handleEvent,
    isRetryableError,
  });

  return {
    seriesState,
    lastEvent,
    doubleProposal,
    clearDoubleProposal,
    lastEmote,
    gameOverInfo,
    seriesCompleteInfo,
  };
}
