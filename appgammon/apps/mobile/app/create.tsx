/**
 * Create Session Screen
 * Wireframe 2: Session code, share button, game settings, waiting indicator
 */

import { useState, useEffect } from "react";
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
import { api, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CodeDisplay } from "@/components/ui/code-display";

type BestOf = 3 | 5 | 7;

export default function CreateSessionScreen() {
  const router = useRouter();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
  const { deviceId, isLoading: deviceIdLoading } = useDeviceId();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [session, setSession] = useState<Session | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Game settings (UI only for now - not wired to backend)
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [gameClock, setGameClock] = useState(false);

  // Create session on mount
  useEffect(() => {
    async function createSession() {
      if (!deviceId || !displayName) return;

      setIsCreating(true);
      setError("");

      try {
        const newSession = await api.createSession(deviceId, displayName);
        setSession(newSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create session");
      } finally {
        setIsCreating(false);
      }
    }

    if (!deviceIdLoading && deviceId) {
      createSession();
    }
  }, [deviceId, deviceIdLoading, displayName]);

  // Poll for opponent joining
  useEffect(() => {
    if (!session || session.status !== "open") return;

    const interval = setInterval(async () => {
      try {
        const updatedSession = await api.getSession(session.id);
        if (updatedSession && updatedSession.status === "active") {
          // Opponent joined! Navigate to lobby
          router.replace({
            pathname: "/lobby",
            params: {
              sessionId: session.id,
              displayName,
              isHost: "true",
            },
          });
        }
      } catch {
        // Polling endpoint not implemented yet, ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session, displayName, router]);

  const handleShare = async () => {
    if (!session) return;

    const message = `Join my Backgammon game! Use code: ${session.id}`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Note: expo-sharing works best with files
        // For text sharing, we'd typically use react-native-share
        // For now, we'll show an alert with the code
        Alert.alert(
          "Share Code",
          message,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Share Code", message);
      }
    } catch {
      Alert.alert("Share Code", message);
    }
  };

  const handleGoToLobby = () => {
    if (!session) return;
    router.replace({
      pathname: "/lobby",
      params: {
        sessionId: session.id,
        displayName,
        isHost: "true",
      },
    });
  };

  if (deviceIdLoading || isCreating) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
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
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
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

        {/* Debug: Go to Lobby manually */}
        <Button
          title="Go to Lobby (Debug)"
          variant="outline"
          onPress={handleGoToLobby}
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
