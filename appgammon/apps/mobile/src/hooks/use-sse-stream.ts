import { useCallback, useEffect, useRef } from "react";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import { connectSSE, type SSEConnectionError, type SSEEvent } from "@/lib/sse";

interface UseSSEStreamOptions {
  enabled: boolean;
  path: string;
  logPrefix: string;
  resetState: () => void;
  onEvent: (event: SSEEvent) => void;
  onTerminalError?: (error: SSEConnectionError) => void;
  isRetryableError?: (error: SSEConnectionError | undefined) => boolean;
}

export function useSSEStream({
  enabled,
  path,
  logPrefix,
  resetState,
  onEvent,
  onTerminalError,
  isRetryableError,
}: UseSSEStreamOptions) {
  const disconnectRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const missingAuthAttemptsRef = useRef(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetState();
      return;
    }

    let cancelled = false;

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

      const [token, deviceId] = await Promise.all([getAuthToken(), getDeviceId()]);
      if (cancelled) return;

      if (!deviceId) {
        scheduleReconnect();
        return;
      }

      if (!token) {
        missingAuthAttemptsRef.current += 1;
        if (missingAuthAttemptsRef.current >= 3) {
          console.log(`[${logPrefix}] Missing auth token; giving up`);
          onTerminalError?.({
            retryable: false,
            kind: "http",
            name: "Error",
            message: "Missing auth token",
          });
          return;
        }
        scheduleReconnect();
        return;
      }

      missingAuthAttemptsRef.current = 0;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "X-Device-Id": deviceId,
      };

      disconnectRef.current?.();
      disconnectRef.current = connectSSE(
        `${API_BASE_URL}${path}`,
        headers,
        (event) => {
          if (cancelled) return;
          reconnectAttemptsRef.current = 0;
          onEvent(event);
        },
        (error) => {
          if (cancelled) return;

          console.log(`[${logPrefix}] Connection error:`, error);
          disconnectRef.current?.();
          disconnectRef.current = null;

          const sseError = error as SSEConnectionError | undefined;
          const retryable = isRetryableError
            ? isRetryableError(sseError)
            : (sseError?.retryable ?? true);

          if (retryable) {
            scheduleReconnect();
            return;
          }

          onTerminalError?.(
            sseError ?? {
              retryable: false,
              kind: "http",
              name: "Error",
              message: "Terminal SSE error",
            },
          );
        },
      );
    }

    resetState();
    reconnectAttemptsRef.current = 0;
    missingAuthAttemptsRef.current = 0;
    void connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [
    clearReconnectTimer,
    enabled,
    isRetryableError,
    logPrefix,
    onEvent,
    onTerminalError,
    path,
    resetState,
  ]);
}
