/**
 * Lobby / Waiting Room Screen
 * Wireframe 4: Player list, scoreboard, start game button (host only), leave button
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { api, SessionWithPlayers } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/ui/player-card";

export default function LobbyScreen() {
  const router = useRouter();
  const { sessionId, displayName, isHost } = useLocalSearchParams<{
    sessionId: string;
    displayName: string;
    isHost: string;
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const isHostBool = isHost === "true";

  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score] = useState({ player1: 0, player2: 0 });

  // Fetch session data initially and poll for updates
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const sessionData = await api.getSession(sessionId);
      if (sessionData) {
        setSession(sessionData);
        setError(null);
      } else {
        setError("Session not found");
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setError("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll for updates every 2 seconds
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId, fetchSession]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      "Leave Session",
      "Are you sure you want to leave this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.replace("/"),
        },
      ]
    );
  }, [router]);

  const handleStartGame = useCallback(() => {
    if (!session?.player_2) {
      Alert.alert("Cannot Start", "Waiting for an opponent to join.");
      return;
    }
    // TODO: Navigate to game board screen
    Alert.alert("Starting Game", "Game board not implemented yet!");
  }, [session]);

  const handleRematch = useCallback(() => {
    Alert.alert("Rematch", "Rematch functionality not implemented yet!");
  }, []);

  // Format session code with hyphen
  const formattedCode = sessionId
    ? `${sessionId.slice(0, 4)}-${sessionId.slice(4)}`
    : "";

  // Determine if opponent has joined
  const opponentJoined = session?.player_2 !== null;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: "#EF4444" }]}>
            {error || "Session not found"}
          </Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => router.replace("/")}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header with Leave button */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        {/* Session Code */}
        <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
          Code: {formattedCode}
        </Text>

        {/* Session Status */}
        <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
          Status: {session.status}
        </Text>

        {/* Players Section */}
        <View style={styles.playersSection}>
          {/* Player 1 (Host) */}
          <PlayerCard
            name={session.player_1?.name || "Host"}
            isHost={true}
            status="ready"
          />

          {/* Player 2 or Waiting */}
          {session.player_2 ? (
            <PlayerCard
              name={session.player_2.name || "Player 2"}
              isHost={false}
              status="joined"
            />
          ) : (
            <View
              style={[
                styles.waitingCard,
                { borderColor: colors.border, backgroundColor: colors.cardBackground },
              ]}
            >
              <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                Waiting for opponent...
              </Text>
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}
        </View>

        {/* Scoreboard */}
        <View style={styles.scoreSection}>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>
            Scoreboard: {score.player1} - {score.player2}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {isHostBool && (
            <Button
              title="Start Game"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!opponentJoined}
              onPress={handleStartGame}
            />
          )}

          {isHostBool && (
            <Text style={[styles.hostOnlyText, { color: colors.textMuted }]}>
              (Host only)
            </Text>
          )}

          {!isHostBool && !opponentJoined && (
            <Text style={[styles.waitingHostText, { color: colors.textMuted }]}>
              Waiting for host to start the game...
            </Text>
          )}

          <Button
            title="Rematch (post-game)"
            variant="ghost"
            size="md"
            fullWidth
            disabled
            onPress={handleRematch}
            style={styles.rematchButton}
          />
        </View>
      </ScrollView>
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
  codeLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: Spacing.lg,
  },
  playersSection: {
    width: "100%",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  waitingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
  },
  waitingText: {
    fontSize: 14,
  },
  scoreSection: {
    marginBottom: Spacing.xl,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  actionSection: {
    width: "100%",
    maxWidth: 300,
    alignItems: "center",
    gap: Spacing.xs,
  },
  hostOnlyText: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  waitingHostText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  rematchButton: {
    marginTop: Spacing.lg,
  },
});
