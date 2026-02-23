/**
 * Game Screen (placeholder)
 * Shows session info and both player names while game is in progress.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionEvents } from "@/hooks/use-session-events";
import { cancelSession } from "@/lib/api";

export default function GameScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { session, lastEvent } = useSessionEvents(sessionId);
  const navigatedRef = useRef(false);

  useEffect(() => {
    const shouldExitSession =
      lastEvent === "session_cancelled" || session?.status === "cancelled";

    if (shouldExitSession && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace("/");
    }
  }, [lastEvent, session, router]);

  const doLeave = useCallback(async () => {
    if (sessionId) {
      try {
        await cancelSession(sessionId);
      } catch {
        // Best-effort cancel
      }
    }
    router.replace("/");
  }, [router, sessionId]);

  const handleLeave = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave? The session will be cancelled.")) {
        doLeave();
      }
      return;
    }

    Alert.alert(
      "Leave Game",
      "Are you sure you want to leave? The session will be cancelled.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: doLeave },
      ],
    );
  }, [doLeave]);

  if (!session) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Game in Progress
        </Text>

        <Text style={[styles.sessionCode, { color: colors.textMuted }]}>
          Session: {session.id}
        </Text>

        <View style={styles.playersContainer}>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {session.player_1?.name ?? "Player 1"}
          </Text>
          <Text style={[styles.vs, { color: colors.textMuted }]}>vs</Text>
          <Text style={[styles.playerName, { color: colors.text }]}>
            {session.player_2?.name ?? "Player 2"}
          </Text>
        </View>

        <Text style={[styles.placeholder, { color: colors.textMuted }]}>
          Board coming soon...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  leaveButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  leaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  headerSpacer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  sessionCode: {
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  playersContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  playerName: {
    fontSize: 20,
    fontWeight: "600",
  },
  vs: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 16,
    fontStyle: "italic",
  },
});
