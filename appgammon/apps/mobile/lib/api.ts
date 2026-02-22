/**
 * API client for communicating with the backend server
 */

import { Platform } from "react-native";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    web: "http://localhost:3000",
    default: "http://10.0.0.206:3000",
  });

export interface PlayerInfo {
  id: string;
  name: string | null;
}

export interface Session {
  id: string;
  status: "open" | "active" | "closed";
  player_1_id: string;
  player_2_id: string | null;
  created_at: string;
}

export interface SessionWithPlayers extends Session {
  player_1: PlayerInfo;
  player_2: PlayerInfo | null;
}

export interface ApiError {
  error: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${options.method || "GET"} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ApiError).error || "An error occurred");
    }

    return data as T;
  }

  /**
   * Create a new game session
   */
  async createSession(deviceId: string, displayName: string): Promise<Session> {
    return this.request<Session>("/sessions/create", {
      method: "POST",
      body: JSON.stringify({
        device_id: deviceId,
        display_name: displayName,
      }),
    });
  }

  /**
   * Join an existing game session
   */
  async joinSession(
    deviceId: string,
    displayName: string,
    sessionId: string,
  ): Promise<Session> {
    return this.request<Session>("/sessions/join", {
      method: "POST",
      body: JSON.stringify({
        device_id: deviceId,
        display_name: displayName,
        session_id: sessionId.toUpperCase().replace(/-/g, ""),
      }),
    });
  }

  /**
   * Get session details with player names (for lobby polling)
   */
  async getSession(sessionId: string): Promise<SessionWithPlayers | null> {
    try {
      return await this.request<SessionWithPlayers>(
        `/sessions/${sessionId.toUpperCase().replace(/-/g, "")}`,
      );
    } catch (error) {
      console.log("[API] getSession error:", error);
      return null;
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
