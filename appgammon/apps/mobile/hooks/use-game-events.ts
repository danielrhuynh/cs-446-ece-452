import { useEffect, useRef, useState, useCallback } from "react";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import { connectSSE, type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import type { GameEventType, SeriesState } from "@appgammon/common";

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

  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const missingAuthAttemptsRef = useRef(0);

  const clearDoubleProposal = useCallback(() => setDoubleProposal(null), []);

  useEffect(() => {
    if (!sessionId) {
      setSeriesState(null);
      setLastEvent(null);
      return;
    }

    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnectTimer();

      const attempt = Math.min(reconnectAttemptsRef.current, 6);
      const delayMs = Math.min(1000 * 2 ** attempt, 15000);
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        void connect();
      }, delayMs);
    };

    async function connect() {
      clearReconnectTimer();

      const [token, deviceId] = await Promise.all([
        getAuthToken(),
        getDeviceId(),
      ]);

      if (cancelled) return;

      if (!deviceId) {
        scheduleReconnect();
        return;
      }

      if (!token) {
        missingAuthAttemptsRef.current += 1;
        if (missingAuthAttemptsRef.current >= 3) {
          console.log("[GameSSE] Missing auth token; giving up");
          return;
        }
        scheduleReconnect();
        return;
      }

      missingAuthAttemptsRef.current = 0;

      const url = `${API_BASE_URL}/games/${sessionId}/events`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "X-Device-Id": deviceId,
      };

      disconnectRef.current?.();
      const disconnect = connectSSE(
        url,
        headers,
        (evt: SSEEvent) => {
          if (cancelled) return;
          reconnectAttemptsRef.current = 0;

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
                setDoubleProposal(null);
                break;
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
          }
        },
        (error) => {
          if (!cancelled) {
            console.log("[GameSSE] Connection error:", error);
            disconnectRef.current?.();
            disconnectRef.current = null;

            const sseErr = error as SSEConnectionError | undefined;

            // 404 = series not created yet (race with startSeries); always retry
            const is404 = sseErr?.status === 404;
            const retryable =
              is404 ||
              (typeof error === "object" &&
                error !== null &&
                "retryable" in error &&
                typeof sseErr?.retryable === "boolean"
                  ? sseErr.retryable
                  : true);
            if (retryable) {
              scheduleReconnect();
            }
          }
        },
      );

      disconnectRef.current = disconnect;
    }

    setSeriesState(null);
    setLastEvent(null);
    setDoubleProposal(null);
    setLastEmote(null);
    setGameOverInfo(null);
    setSeriesCompleteInfo(null);
    reconnectAttemptsRef.current = 0;
    missingAuthAttemptsRef.current = 0;
    void connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [sessionId]);

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
