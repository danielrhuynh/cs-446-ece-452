import { hc, type InferResponseType } from "hono/client";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import type { AppType } from "@server/app";

const REQUEST_TIMEOUT_MS = 10000;

const client = hc<AppType>(API_BASE_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const [token, deviceId] = await Promise.all([
      getAuthToken(),
      getDeviceId(),
    ]);

    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (deviceId) headers.set("X-Device-Id", deviceId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, { ...init, headers, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
            `Cannot reach backend at ${API_BASE_URL}.`,
        );
      }
      throw new Error(
        `Network request failed. Cannot reach backend at ${API_BASE_URL}.`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

async function unwrap<T>(res: { ok: boolean; json(): Promise<unknown> }): Promise<T> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        "The server returned an invalid error response",
    );
  }

  if (data === null) {
    throw new Error("The server returned an empty response");
  }

  return data as T;
}

// Inferred response types from RPC routes (success-only, errors are thrown)
export type CreateSessionRes = InferResponseType<typeof client.sessions.create.$post, 200>;
export type JoinSessionRes = InferResponseType<typeof client.sessions.join.$post, 200>;
export type GetSessionRes = InferResponseType<typeof client.sessions[":id"]["$get"], 200>;
export type StartGameRes = InferResponseType<typeof client.sessions[":id"]["start"]["$post"], 200>;
export type CancelSessionRes = InferResponseType<typeof client.sessions[":id"]["cancel"]["$post"], 200>;

export async function createSession(deviceId: string, displayName: string) {
  const res = await client.sessions.create.$post({
    json: { device_id: deviceId, display_name: displayName },
  });
  return unwrap<CreateSessionRes>(res);
}

export async function joinSession(deviceId: string, displayName: string, sessionId: string) {
  const res = await client.sessions.join.$post({
    json: {
      device_id: deviceId,
      display_name: displayName,
      session_id: sessionId.toUpperCase().replace(/-/g, ""),
    },
  });
  return unwrap<JoinSessionRes>(res);
}

export async function startGame(sessionId: string) {
  const res = await client.sessions[":id"].start.$post({
    param: { id: sessionId.toUpperCase().replace(/-/g, "") },
  });
  return unwrap<StartGameRes>(res);
}

export async function cancelSession(sessionId: string) {
  const res = await client.sessions[":id"].cancel.$post({
    param: { id: sessionId.toUpperCase().replace(/-/g, "") },
  });
  return unwrap<CancelSessionRes>(res);
}

export async function getSession(sessionId: string) {
  try {
    const res = await client.sessions[":id"].$get({
      param: { id: sessionId.toUpperCase().replace(/-/g, "") },
    });
    return await unwrap<GetSessionRes>(res);
  } catch (error) {
    console.log("[API] getSession error:", error);
    return null;
  }
}
