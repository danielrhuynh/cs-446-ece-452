/**
 * AsyncStorage helpers for persisting app data
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  DISPLAY_NAME: "@appgammon/display_name",
  DEVICE_ID: "@appgammon/device_id",
  AUTH_TOKEN: "appgammon_auth_token",
  HAS_SEEN_TUTORIAL: "@appgammon/has_seen_tutorial",
} as const;

/**
 * Get the stored display name
 */
export async function getDisplayName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
  } catch {
    return null;
  }
}

/**
 * Save the display name
 */
export async function setDisplayName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, name);
  } catch {
    console.error("Failed to save display name");
  }
}

/**
 * Get the stored device ID
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  } catch {
    return null;
  }
}

/**
 * Save the device ID
 */
export async function setDeviceId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
  } catch {
    console.error("Failed to save device ID");
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    const secureToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (secureToken) return secureToken;
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  }
}

export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return;
  }

  let secureStoreError: unknown = null;
  let asyncStorageError: unknown = null;

  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    secureStoreError = error;
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (error) {
    asyncStorageError = error;
  }

  if (secureStoreError && asyncStorageError) {
    throw new Error("Failed to persist auth token");
  }

  if (secureStoreError) {
    console.warn("SecureStore unavailable for auth token; using AsyncStorage fallback");
  }
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    // Best-effort clear
  }

  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    // Best-effort clear
  }
}

export async function getHasSeenTutorial(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_TUTORIAL);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setHasSeenTutorial(hasSeen: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_TUTORIAL, hasSeen ? "true" : "false");
  } catch {
    console.error("Failed to persist tutorial status");
  }
}

/**
 * Generate a simple UUID v4
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
