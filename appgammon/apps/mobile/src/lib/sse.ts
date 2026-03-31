/**
 * XHR-based SSE client for React Native (Hermes doesn't support EventSource or ReadableStream)
 */

export interface SSEEvent {
  event: string;
  data: string;
}

export interface SSEConnectionError extends Error {
  status?: number;
  retryable: boolean;
  kind: "network" | "http" | "closed";
}

function createSSEError(
  message: string,
  options: { status?: number; retryable: boolean; kind: SSEConnectionError["kind"] },
): SSEConnectionError {
  const error = new Error(message) as SSEConnectionError;
  error.status = options.status;
  error.retryable = options.retryable;
  error.kind = options.kind;
  return error;
}

export function connectSSE(
  url: string,
  headers: Record<string, string>,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: unknown) => void,
): () => void {
  let aborted = false;
  let ended = false;
  let processedLength = 0;
  let buffer = "";

  const emitError = (error: unknown) => {
    if (aborted || ended) return;
    ended = true;
    onError?.(error);
  };

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);

  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value);
  }

  xhr.onprogress = () => {
    if (aborted) return;

    const newData = xhr.responseText.slice(processedLength);
    processedLength = xhr.responseText.length;
    buffer += newData;

    // Parse SSE messages (separated by double newlines)
    const messages = buffer.split("\n\n");
    // Last element is incomplete — keep it in buffer
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      if (!message.trim()) continue;

      let eventName = "message";
      let data = "";

      for (const line of message.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += (data ? "\n" : "") + line.slice(5).trim();
        } else if (line.startsWith(":")) {
          // Comment, ignore (used for keep-alive)
        }
      }

      if (data) {
        onEvent({ event: eventName, data });
      }
    }
  };

  xhr.onerror = () => {
    emitError(createSSEError("SSE connection error", { retryable: true, kind: "network" }));
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState !== XMLHttpRequest.DONE || aborted || ended) return;

    if (xhr.status >= 200 && xhr.status < 300) {
      emitError(createSSEError("SSE connection closed", { retryable: true, kind: "closed" }));
      return;
    }

    const status = xhr.status;
    const retryable = ![400, 401, 403, 404].includes(status);
    emitError(
      createSSEError(`SSE request failed with status ${status}`, {
        status,
        retryable,
        kind: "http",
      }),
    );
  };

  xhr.send();

  return () => {
    aborted = true;
    ended = true;
    xhr.abort();
  };
}
