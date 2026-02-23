import { useEffect, useRef, useState } from "react";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import { connectSSE, type SSEConnectionError, type SSEEvent } from "@/lib/sse";
import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";

export function useSessionEvents(sessionId: string | undefined) {
  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [lastEvent, setLastEvent] = useState<SessionEventType | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const missingAuthAttemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
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
          console.log("[SSE] Missing auth token; exiting session stream");
          setLastEvent("session_cancelled");
          return;
        }
        scheduleReconnect();
        return;
      }

      missingAuthAttemptsRef.current = 0;

      const url = `${API_BASE_URL}/sessions/${sessionId}/events`;
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
          try {
            const data = JSON.parse(evt.data) as SessionWithPlayers;
            setSession(data);
            setLastEvent(evt.event as SessionEventType);
          } catch {
            // Ignore parse errors
          }
        },
        (error) => {
          if (!cancelled) {
            console.log("[SSE] Connection error:", error);
            disconnectRef.current?.();
            disconnectRef.current = null;
            const retryable =
              typeof error === "object" &&
              error !== null &&
              "retryable" in error &&
              typeof (error as SSEConnectionError).retryable === "boolean"
                ? (error as SSEConnectionError).retryable
                : true;
            if (retryable) {
              scheduleReconnect();
              return;
            }
            // Terminal auth/session failures should not loop forever.
            // Bubble this as a session exit so screens can navigate away.
            setLastEvent("session_cancelled");
          }
        },
      );

      disconnectRef.current = disconnect;
    }

    setSession(null);
    setLastEvent(null);
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

  return { session, lastEvent };
}
