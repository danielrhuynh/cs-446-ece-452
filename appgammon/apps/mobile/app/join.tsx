/**
 * Join Session Screen
 * Wireframe 3: Session code input, join button
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeviceId } from "@/hooks/use-device-id";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";

export default function JoinSessionScreen() {
  const router = useRouter();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [sessionCode, setSessionCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoinSession = async () => {
    if (sessionCode.length !== 6) {
      setError("Please enter a valid 6-character code");
      return;
    }

    if (!deviceId || !displayName) {
      setError("Missing device ID or display name");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const session = await api.joinSession(deviceId, displayName, sessionCode);
      
      // Successfully joined! Navigate to lobby
      router.replace({
        pathname: "/lobby",
        params: {
          sessionId: session.id,
          displayName,
          isHost: "false",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join session";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Instructions */}
          <Text style={[styles.title, { color: colors.text }]}>
            Enter Session Code
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Ask your friend for their 6-character code
          </Text>

          {/* Code Input */}
          <View style={styles.codeInputContainer}>
            <CodeInput
              value={sessionCode}
              onChange={(code) => {
                setSessionCode(code);
                if (error) setError("");
              }}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Join Button */}
          <Button
            title="Join Session"
            variant="secondary"
            size="lg"
            fullWidth
            loading={isJoining || deviceIdLoading}
            disabled={sessionCode.length !== 6}
            onPress={handleJoinSession}
            style={styles.joinButton}
          />

          {/* Help Text */}
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            The code is case-insensitive (e.g., XK49TZ)
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  codeInputContainer: {
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  joinButton: {
    maxWidth: 300,
  },
  helpText: {
    fontSize: 12,
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
