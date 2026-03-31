import { hc, type InferResponseType } from "hono/client";
import { getAuthToken, getDeviceId } from "@/lib/storage";
import { API_BASE_URL } from "@/lib/api-base-url";
import type { AppType } from "@server/app";
import type { EmoteId, Move } from "@appgammon/common";

const REQUEST_TIMEOUT_MS = 10000;

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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
}

const client = hc<AppType>(API_BASE_URL, {
  fetch: authFetch,
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

// ── Session response types ──

export type CreateSessionRes = InferResponseType<typeof client.sessions.$post, 200>;
export type JoinSessionRes = InferResponseType<
  (typeof client.sessions)[":id"]["join"]["$post"],
  200
>;
export type CancelSessionRes = InferResponseType<(typeof client.sessions)[":id"]["$delete"], 200>;

// ── Match response types ──

export type StartMatchRes = InferResponseType<
  (typeof client.sessions)[":id"]["match"]["$post"],
  200
>;
export type SyncMatchRes = InferResponseType<(typeof client.sessions)[":id"]["match"]["$get"], 200>;

// ── Session API ──

export async function createSession(deviceId: string, displayName: string) {
  const res = await client.sessions.$post({
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

export async function cancelSession(sessionId: string) {
  const res = await client.sessions[":id"].$delete({
    param: { id: normalizeId(sessionId) },
  });
  return unwrap<CancelSessionRes>(res);
}

// ── Match API ──

export async function startMatch(sessionId: string, targetScore: number) {
  const res = await client.sessions[":id"].match.$post({
    param: { id: normalizeId(sessionId) },
    json: { target_score: targetScore as 1 | 3 | 5 | 7 },
  });
  return unwrap<StartMatchRes>(res);
}

export async function syncMatch(sessionId: string) {
  const res = await client.sessions[":id"].match.$get({
    param: { id: normalizeId(sessionId) },
  });
  return unwrap<SyncMatchRes>(res);
}

export async function submitMoves(
  sessionId: string,
  gameId: string,
  version: number,
  moves: Move[],
) {
  const res = await client.sessions[":id"].match.games[":gameId"].moves.$put({
    param: { id: normalizeId(sessionId), gameId },
    json: { version, moves },
  });
  return unwrap<{ ok: true }>(res);
}

export async function proposeDouble(sessionId: string, gameId: string) {
  const res = await client.sessions[":id"].match.games[":gameId"].double.$post({
    param: { id: normalizeId(sessionId), gameId },
    json: { action: "propose" },
  });
  return unwrap<{ ok: true }>(res);
}

export async function respondToDouble(
  sessionId: string,
  gameId: string,
  action: "accept" | "decline",
) {
  const res = await client.sessions[":id"].match.games[":gameId"].double.$post({
    param: { id: normalizeId(sessionId), gameId },
    json: { action },
  });
  return unwrap<{ ok: true }>(res);
}

export async function rollDice(sessionId: string, gameId: string) {
  const res = await client.sessions[":id"].match.games[":gameId"].roll.$post({
    param: { id: normalizeId(sessionId), gameId },
  });
  return unwrap<{ ok: true }>(res);
}

export async function sendEmote(sessionId: string, emoteId: EmoteId) {
  const res = await client.sessions[":id"].match.emotes.$post({
    param: { id: normalizeId(sessionId) },
    json: { emote_id: emoteId },
  });
  return unwrap<{ ok: true }>(res);
}
