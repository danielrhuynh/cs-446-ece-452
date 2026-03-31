import { useCallback, useState } from "react";
import { type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";
import { useSSEStream } from "./use-sse-stream";

export function useSessionEvents(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [lastEvent, setLastEvent] = useState<SessionEventType | null>(null);

  const resetState = useCallback(() => {
    setSession(null);
    setLastEvent(null);
  }, []);

  const handleEvent = useCallback((evt: SSEEvent) => {
    try {
      const data = JSON.parse(evt.data) as SessionWithPlayers;
      setSession(data);
      setLastEvent(evt.event as SessionEventType);
    } catch {
      // Ignore parse errors.
    }
  }, []);

  const handleTerminalError = useCallback((_error: SSEConnectionError) => {}, []);

  const isRetryableError = useCallback(
    (error: SSEConnectionError | undefined) => error?.retryable !== false,
    [],
  );

  useSSEStream({
    enabled: !!sessionId,
    path: sessionId ? `/sessions/${sessionId}/events` : "",
    logPrefix: "SSE",
    resetState,
    onEvent: handleEvent,
    onTerminalError: handleTerminalError,
    isRetryableError,
  });

  return { session, lastEvent };
}
