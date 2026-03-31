import { hc, type InferResponseType } from "hono/client";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import type { AppType } from "@server/app";
import type { Move } from "@appgammon/common";

const REQUEST_TIMEOUT_MS = 10000;

const client = hc<AppType>(API_BASE_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const [token, deviceId] = await Promise.all([getAuthToken(), getDeviceId()]);

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
      throw new Error(`Network request failed. Cannot reach backend at ${API_BASE_URL}.`);
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
      (data as { error?: string } | null)?.error ?? "The server returned an invalid error response",
    );
  }

  if (data === null) {
    throw new Error("The server returned an empty response");
  }

  return data as T;
}

function normalizeId(sessionId: string) {
  return sessionId.toUpperCase().replace(/-/g, "");
}

/**
 * Authenticated fetch for routes where query params aren't part of the
 * Hono RPC type (double, roll, emote use `c.req.query()` directly).
 */
async function apiFetch(path: string, method: string = "POST"): Promise<Response> {
  const [token, deviceId] = await Promise.all([getAuthToken(), getDeviceId()]);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (deviceId) headers["X-Device-Id"] = deviceId;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
          `Cannot reach backend at ${API_BASE_URL}.`,
      );
    }
    throw new Error(`Network request failed. Cannot reach backend at ${API_BASE_URL}.`);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Session response types ──

export type CreateSessionRes = InferResponseType<typeof client.sessions.create.$post, 200>;
export type JoinSessionRes = InferResponseType<
  (typeof client.sessions)[":id"]["join"]["$post"],
  200
>;
export type GetSessionRes = InferResponseType<(typeof client.sessions)[":id"]["$get"], 200>;
export type StartGameRes = InferResponseType<
  (typeof client.sessions)[":id"]["start"]["$post"],
  200
>;
export type CancelSessionRes = InferResponseType<
  (typeof client.sessions)[":id"]["cancel"]["$post"],
  200
>;

// ── Game response types ──

export type StartSeriesRes = InferResponseType<
  (typeof client.games)[":id"]["series"]["start"]["$post"],
  200
>;
export type SyncGameRes = InferResponseType<(typeof client.games)[":id"]["sync"]["$get"], 200>;

// ── Session API ──

export async function createSession(deviceId: string, displayName: string) {
  const res = await client.sessions.create.$post({
    json: { device_id: deviceId, display_name: displayName },
  });
  return unwrap<CreateSessionRes>(res);
}

export async function joinSession(deviceId: string, displayName: string, sessionId: string) {
  const res = await client.sessions[":id"].join.$post({
    param: { id: normalizeId(sessionId) },
    json: { device_id: deviceId, display_name: displayName },
  });
  return unwrap<JoinSessionRes>(res);
}

export async function startGame(sessionId: string) {
  const res = await client.sessions[":id"].start.$post({
    param: { id: normalizeId(sessionId) },
  });
  return unwrap<StartGameRes>(res);
}

export async function cancelSession(sessionId: string) {
  const res = await client.sessions[":id"].cancel.$post({
    param: { id: normalizeId(sessionId) },
  });
  return unwrap<CancelSessionRes>(res);
}

export async function getSession(sessionId: string) {
  try {
    const res = await client.sessions[":id"].$get({
      param: { id: normalizeId(sessionId) },
    });
    return await unwrap<GetSessionRes>(res);
  } catch (error) {
    console.log("[API] getSession error:", error);
    return null;
  }
}

// ── Game API ──

export async function startSeries(sessionId: string, bestOf: number) {
  const res = await client.games[":id"].series.start.$post({
    param: { id: normalizeId(sessionId) },
    json: { best_of: bestOf as 1 | 3 | 5 | 7 },
  });
  return unwrap<StartSeriesRes>(res);
}

export async function syncGame(sessionId: string) {
  const res = await client.games[":id"].sync.$get({
    param: { id: normalizeId(sessionId) },
  });
  return unwrap<SyncGameRes>(res);
}

export async function submitMoves(
  sessionId: string,
  gameId: string,
  version: number,
  moves: Move[],
) {
  const res = await client.games[":id"]["board-state"].$put({
    param: { id: normalizeId(sessionId) },
    json: { game_id: gameId, version, moves },
  });
  return unwrap<{ ok: true }>(res);
}

export async function proposeDouble(sessionId: string, gameId: string) {
  const id = normalizeId(sessionId);
  const res = await apiFetch(`/games/${id}/double?action=propose&game_id=${gameId}`);
  return unwrap<{ ok: true }>(res);
}

export async function respondToDouble(
  sessionId: string,
  gameId: string,
  action: "accept" | "decline",
) {
  const id = normalizeId(sessionId);
  const res = await apiFetch(`/games/${id}/double?action=${action}&game_id=${gameId}`);
  return unwrap<{ ok: true }>(res);
}

export async function rollDice(sessionId: string, gameId: string) {
  const id = normalizeId(sessionId);
  const res = await apiFetch(`/games/${id}/roll?game_id=${gameId}`);
  return unwrap<{ ok: true }>(res);
}

export async function sendEmote(sessionId: string, emoteId: string) {
  const id = normalizeId(sessionId);
  const res = await apiFetch(`/games/${id}/emote?id=${emoteId}`);
  return unwrap<{ ok: true }>(res);
}
