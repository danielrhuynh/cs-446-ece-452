/**
 * AsyncStorage helpers for persisting app data
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  DISPLAY_NAME: "@appgammon/display_name",
  DEVICE_ID: "@appgammon/device_id",
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
