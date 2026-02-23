/**
 * Create Session Screen
 * Wireframe 2: Session code, share button, game settings, waiting indicator
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeviceId } from "@/hooks/use-device-id";
import { useSessionEvents } from "@/hooks/use-session-events";
import { createSession, cancelSession, type CreateSessionRes } from "@/lib/api";
import { setAuthToken } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { CodeDisplay } from "@/components/ui/code-display";

type BestOf = 3 | 5 | 7;

export default function CreateSessionScreen() {
  const router = useRouter();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [session, setSession] = useState<CreateSessionRes | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const createRequestedRef = useRef(false);

  // Game settings (UI only for now - not wired to backend)
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [gameClock, setGameClock] = useState(false);

  // Create session on mount
  useEffect(() => {
    async function doCreateSession() {
      if (!deviceId || !displayName || createRequestedRef.current) return;

      createRequestedRef.current = true;
      setIsCreating(true);
      setError("");

      try {
        const newSession = await createSession(deviceId, displayName);
        await setAuthToken(newSession.auth_token);
        setSession(newSession);
      } catch (err) {
        createRequestedRef.current = false;
        setError(
          err instanceof Error ? err.message : "Failed to create session",
        );
      } finally {
        setIsCreating(false);
      }
    }

    if (!deviceIdLoading && deviceId) {
      doCreateSession();
    }
  }, [deviceId, deviceIdLoading, displayName]);

  // SSE: listen for opponent joining
  const { session: sseSession, lastEvent: sseEvent } = useSessionEvents(
    session?.id,
  );
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (navigatedRef.current) return;

    const latestSession = sseSession ?? session;

    if (sseEvent === "session_cancelled" || latestSession?.status === "cancelled") {
      navigatedRef.current = true;
      router.replace("/");
      return;
    }

    const shouldEnterLobby =
      !!latestSession &&
      (sseEvent === "player_joined" ||
        latestSession.status === "closed" ||
        latestSession.status === "in_game");

    if (shouldEnterLobby) {
      navigatedRef.current = true;
      router.replace({
        pathname: "/lobby",
        params: {
          sessionId: latestSession.id,
          displayName,
          isHost: "true",
        },
      });
    }
  }, [sseEvent, session, sseSession, displayName, router]);

  const handleCancel = async () => {
    if (!session) {
      router.replace("/");
      return;
    }
    try {
      await cancelSession(session.id);
    } catch {
      // Best-effort cancel
    }
    router.replace("/");
  };

  const handleShare = async () => {
    if (!session) return;

    const message = `Join my Backgammon game! Use code: ${session.id}`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Note: expo-sharing works best with files
        // For text sharing, we'd typically use react-native-share
        // For now, we'll show an alert with the code
        Alert.alert("Share Code", message, [{ text: "OK" }]);
      } else {
        Alert.alert("Share Code", message);
      }
    } catch {
      Alert.alert("Share Code", message);
    }
  };

  if (deviceIdLoading || isCreating) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Creating session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
          <Button
            title="Try Again"
            variant="primary"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        {/* Session Code Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Session Code
          </Text>
          {session && <CodeDisplay code={session.id} />}
          <Button
            title="Share Code"
            variant="primary"
            onPress={handleShare}
            style={{ marginTop: Spacing.md }}
          />
        </View>

        {/* Game Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Game Settings
          </Text>

          {/* Best Of Selector */}
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Best of:
            </Text>
            <View style={styles.settingOptions}>
              {([3, 5, 7] as BestOf[]).map((value) => (
                <Button
                  key={value}
                  title={String(value)}
                  variant={bestOf === value ? "primary" : "ghost"}
                  size="sm"
                  onPress={() => setBestOf(value)}
                />
              ))}
            </View>
          </View>

          {/* Game Clock Selector */}
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Game Clock:
            </Text>
            <View style={styles.settingOptions}>
              <Button
                title="ON"
                variant={gameClock ? "primary" : "ghost"}
                size="sm"
                onPress={() => setGameClock(true)}
              />
              <Button
                title="OFF"
                variant={!gameClock ? "primary" : "ghost"}
                size="sm"
                onPress={() => setGameClock(false)}
              />
            </View>
          </View>
        </View>

        {/* Waiting Indicator */}
        <View style={styles.waitingSection}>
          <Text style={[styles.waitingText, { color: colors.textMuted }]}>
            Waiting for opponent...
          </Text>
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Cancel Session */}
        <Button
          title="Cancel"
          variant="outline"
          onPress={handleCancel}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  section: {
    width: "100%",
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: Spacing.md,
  },
  settingCard: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  settingLabel: {
    fontSize: 14,
  },
  settingOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  waitingSection: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  waitingText: {
    fontSize: 14,
  },
});
