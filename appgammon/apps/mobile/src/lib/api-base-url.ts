import Constants from "expo-constants";
import { Platform } from "react-native";

function extractHost(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    // Supports values like:
    // - exp://10.42.0.203:8081
    // - 10.42.0.203:8081
    // - http://10.42.0.203:8081/path
    const withoutScheme = value.replace(/^[a-zA-Z]+:\/\//, "");
    const hostPort = withoutScheme.split("/")[0] ?? "";
    const host = hostPort.split(":")[0] ?? "";
    return host || null;
  } catch {
    return null;
  }
}

const expoHost =
  extractHost(Constants.expoConfig?.hostUri) ??
  extractHost((Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost) ??
  extractHost(Constants.experienceUrl);

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web"
    ? "http://localhost:3000"
    : expoHost
      ? `http://${expoHost}:3000`
      : "http://localhost:3000");
