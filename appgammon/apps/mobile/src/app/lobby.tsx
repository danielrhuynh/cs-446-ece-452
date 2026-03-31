/** Lobby screen. */

import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionEvents } from "@/hooks/use-session-events";
import { cancelSession, startGame, startSeries, syncGame } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";
import { LoadingCard } from "@/components/ui/loading-card";

/* Status dot. */
function PulsingStatusDot({ color }: { color: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.85, 1.15]) }],
  }));

  return <Animated.View style={[styles.statusDot, { backgroundColor: color }, style]} />;
}

/* Placeholder avatar. */
function EmptyAvatar({ borderColor }: { borderColor: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View style={[styles.avatar, styles.emptyAvatar, { borderColor }, style]}>
      <Text style={[styles.avatarLetter, { color: borderColor }]}>?</Text>
    </Animated.View>
  );
}

/* Session status labels. */
const STATUS_LABELS: Record<string, string> = {
  open: "Waiting for opponent",
  closed: "Ready to start",
  in_game: "Game in progress",
  cancelled: "Session cancelled",
};

/* Screen component. */
export default function LobbyScreen() {
  const router = useRouter();
  const { sessionId, isHost, displayName, bestOf } = useLocalSearchParams<{
    sessionId: string;
    isHost: string;
    displayName: string;
    bestOf?: string;
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const isHostBool = isHost === "true";

  const { session, lastEvent } = useSessionEvents(sessionId);
  const [isStarting, setIsStarting] = useState(false);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const navigatedRef = useRef(false);

  // Load the current series score when available.
  useEffect(() => {
    if (!sessionId) return;
    void syncGame(sessionId)
      .then((state) => {
        if (state) {
          setScore({ player1: state.player1Score, player2: state.player2Score });
        }
      })
      .catch(() => {
        /* No active series yet. */
      });
  }, [sessionId]);

  useEffect(() => {
    if (navigatedRef.current) return;
    if (lastEvent === "session_cancelled" || session?.status === "cancelled") {
      navigatedRef.current = true;
      router.replace("/");
      return;
    }
    if (session && (lastEvent === "game_started" || session.status === "in_game")) {
      navigatedRef.current = true;
      router.replace({
        pathname: "/game",
        params: { sessionId: session.id, isHost: isHostBool ? "true" : "false" },
      });
    }
  }, [isHostBool, lastEvent, session, router]);

  const doLeave = useCallback(async () => {
    if (sessionId) {
      try {
        await cancelSession(sessionId);
      } catch {
        /* best-effort */
      }
    }
    router.replace("/");
  }, [router, sessionId]);

  const handleLeave = useCallback(() => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave this session?")) void doLeave();
      return;
    }
    Alert.alert("Leave Session", "Are you sure you want to leave this session?", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => void doLeave() },
    ]);
  }, [doLeave]);

  const bestOfNum = Number(bestOf) || 3;

  const handleStartGame = useCallback(async () => {
    if (!session?.player_2 || !sessionId) {
      Alert.alert("Cannot Start", "Waiting for an opponent to join.");
      return;
    }
    setIsStarting(true);
    try {
      await startSeries(sessionId, bestOfNum);
      await startGame(sessionId);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setIsStarting(false);
    }
  }, [session, sessionId, bestOfNum]);

  const opponentJoined = session?.player_2 != null;
  const statusText = session ? (STATUS_LABELS[session.status] ?? session.status) : "";

  const youTag = (name: string | null | undefined) => (name === displayName ? " (You)" : "");

  /* Loading state. */
  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.headerWrap}>
          <BackButton onPress={handleLeave} />
        </View>
        <View style={styles.centered}>
          <LoadingCard message="Loading session..." />
        </View>
      </ScreenContainer>
    );
  }

  /* Main render. */
  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <BackButton onPress={handleLeave} />
      </View>

      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.statusSection}>
          <Text style={[styles.title, { color: colors.text }]}>Game Lobby</Text>
          <View style={styles.statusRow}>
            {opponentJoined ? (
              <View
                style={[styles.statusDot, { backgroundColor: colors.primary }]}
                accessibilityLabel="Ready"
              />
            ) : (
              <PulsingStatusDot color={colors.accent} />
            )}
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{statusText}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320)} style={styles.vsWrap}>
          <LiquidGlass style={[styles.vsCard, Shadows.sm]}>
            <View
              style={styles.playerRow}
              accessibilityLabel={`Player 1: ${session.player_1?.name || "Host"}, Host, Ready`}
            >
              <View style={[styles.avatar, { backgroundColor: colors.hostBadge }]}>
                <Text style={styles.avatarLetter}>
                  {(session.player_1?.name || "H")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.text }]}>
                  {session.player_1?.name || "Host"}
                </Text>
                <Text style={[styles.playerRole, { color: colors.textMuted }]}>
                  Host{youTag(session.player_1?.name)}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.hostBadge }]}>
                <Text style={styles.badgeText}>Ready</Text>
              </View>
            </View>

            <View style={styles.vsDivider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <View style={[styles.vsCircle, { borderColor: colors.border }]}>
                <Text style={[styles.vsLabel, { color: colors.textMuted }]}>VS</Text>
              </View>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {session.player_2 ? (
              <Animated.View
                entering={FadeInUp.duration(400)}
                style={styles.playerRow}
                accessibilityLabel={`Player 2: ${session.player_2.name || "Player 2"}, Challenger, Joined`}
              >
                <View style={[styles.avatar, { backgroundColor: colors.joinedBadge }]}>
                  <Text style={styles.avatarLetter}>
                    {(session.player_2.name || "P")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {session.player_2.name || "Player 2"}
                  </Text>
                  <Text style={[styles.playerRole, { color: colors.textMuted }]}>
                    Challenger{youTag(session.player_2.name)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.joinedBadge }]}>
                  <Text style={styles.badgeText}>Joined</Text>
                </View>
              </Animated.View>
            ) : (
              <View style={styles.playerRow} accessibilityLabel="Waiting for opponent">
                <EmptyAvatar borderColor={colors.border} />
                <View style={styles.playerInfo}>
                  <Text style={[styles.waitingForLabel, { color: colors.textMuted }]}>
                    Waiting for opponent
                  </Text>
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginTop: Spacing.xs, alignSelf: "flex-start" }}
                  />
                </View>
              </View>
            )}
          </LiquidGlass>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.scoreWrap}>
          <LiquidGlass style={[styles.scoreCard, Shadows.sm]}>
            <Text style={[styles.scoreHeader, { color: colors.textMuted }]}>SCOREBOARD</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreName, { color: colors.text }]} numberOfLines={1}>
                {session.player_1?.name || "Host"}
              </Text>
              <View style={styles.scoreCenter}>
                <Text style={[styles.scoreNum, { color: colors.text }]}>{score.player1}</Text>
                <Text style={[styles.scoreSep, { color: colors.border }]}>:</Text>
                <Text style={[styles.scoreNum, { color: colors.text }]}>{score.player2}</Text>
              </View>
              <Text
                style={[styles.scoreName, { color: colors.text, textAlign: "right" }]}
                numberOfLines={1}
              >
                {session.player_2?.name || "---"}
              </Text>
            </View>
          </LiquidGlass>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.actionWrap}>
          {isHostBool ? (
            <>
              <Button
                title={isStarting ? "Starting..." : "Start Game"}
                variant={opponentJoined ? "primary" : "outline"}
                size="lg"
                fullWidth
                disabled={!opponentJoined || isStarting}
                onPress={() => void handleStartGame()}
                accessibilityLabel={
                  opponentJoined ? "Start the game" : "Start game (waiting for opponent)"
                }
                accessibilityState={{ disabled: !opponentJoined || isStarting }}
              />
              {!opponentJoined && (
                <Text style={[styles.hintText, { color: colors.textMuted }]}>
                  An opponent must join before you can start
                </Text>
              )}
            </>
          ) : (
            <LiquidGlass style={styles.waitHostCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.waitHostText, { color: colors.textMuted }]}>
                Waiting for host to start the game...
              </Text>
            </LiquidGlass>
          )}
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

/* Styles. */
const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, alignItems: "flex-start" },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },

  /* Status */
  statusSection: { alignItems: "center", marginBottom: Spacing.md },
  title: { fontSize: 26, fontFamily: Fonts.display, marginBottom: Spacing.xs },
  statusRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 15, fontFamily: Fonts.medium },

  /* Matchup card */
  vsWrap: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  vsCard: { padding: Spacing.lg, borderRadius: BorderRadius.xl },
  playerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyAvatar: { backgroundColor: "transparent", borderWidth: 2, borderStyle: "dashed" },
  avatarLetter: { fontSize: 20, fontFamily: Fonts.bold, color: "#FFFFFF" },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 17, fontFamily: Fonts.semibold },
  playerRole: { fontSize: 14, fontFamily: Fonts.medium, marginTop: 2 },
  badge: { borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontFamily: Fonts.semibold, color: "#FFFFFF" },
  waitingForLabel: { fontSize: 15, fontFamily: Fonts.medium },

  vsDivider: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  vsCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  vsLabel: { fontSize: 12, fontFamily: Fonts.bold },

  /* Scoreboard */
  scoreWrap: { width: "100%", maxWidth: Layout.contentMaxWidth, alignSelf: "center" },
  scoreCard: { padding: Spacing.md, borderRadius: BorderRadius.lg },
  scoreHeader: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  scoreRow: { flexDirection: "row", alignItems: "center" },
  scoreName: { flex: 1, fontSize: 15, fontFamily: Fonts.medium },
  scoreCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  scoreNum: { fontSize: 26, fontFamily: Fonts.display, minWidth: 24, textAlign: "center" },
  scoreSep: { fontSize: 22, fontFamily: Fonts.bold },

  /* Action */
  actionWrap: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignItems: "center",
    alignSelf: "center",
  },
  hintText: { fontSize: 14, fontFamily: Fonts.medium, textAlign: "center", marginTop: Spacing.sm },
  waitHostCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  waitHostText: { fontSize: 15, fontFamily: Fonts.medium },
});
