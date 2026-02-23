/**
 * Game Screen (placeholder)
 * Shows session info and both player names while game is in progress.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSessionEvents } from "@/hooks/use-session-events";
import { cancelSession } from "@/lib/api";
import { formatSessionCode } from "@/lib/format";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";
import { BackButton } from "@/components/ui/back-button";

export default function GameScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const { session, lastEvent } = useSessionEvents(sessionId);
  const navigatedRef = useRef(false);

  useEffect(() => {
    const shouldExitSession = lastEvent === "session_cancelled" || session?.status === "cancelled";

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
        void doLeave();
      }
      return;
    }

    Alert.alert("Leave Game", "Are you sure you want to leave? The session will be cancelled.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => void doLeave() },
    ]);
  }, [doLeave]);

  const formattedCode = sessionId ? formatSessionCode(sessionId) : "";

  if (!session) {
    return (
      <ScreenContainer>
        <View style={styles.headerWrap}>
          <BackButton onPress={handleLeave} />
        </View>
        <View style={styles.center}>
          <LiquidGlass style={[styles.loadingCard, Shadows.md]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </LiquidGlass>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerWrap}>
        <BackButton onPress={handleLeave} />
      </View>
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(300)}>
          <LiquidGlass style={[styles.mainCard, Shadows.md]}>
            <Text style={[styles.title, { color: colors.text }]}>Game in Progress</Text>

            <Text style={[styles.sessionCode, { color: colors.textMuted }]}>Session: {formattedCode}</Text>

            <Animated.View entering={FadeInDown.delay(100).duration(250)} style={styles.playersContainer}>
              <Text style={[styles.playerName, { color: colors.text }]}>{session.player_1?.name ?? "Player 1"}</Text>
              <Text style={[styles.vs, { color: colors.textMuted }]}>vs</Text>
              <Text style={[styles.playerName, { color: colors.text }]}>{session.player_2?.name ?? "Player 2"}</Text>
            </Animated.View>

            <Text style={[styles.placeholder, { color: colors.textMuted }]}>Board coming soon...</Text>
          </LiquidGlass>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    alignItems: "flex-start",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  mainCard: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.display,
    marginBottom: Spacing.sm,
  },
  sessionCode: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
  },
  playersContainer: {
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  playerName: {
    fontSize: 22,
    fontFamily: Fonts.semibold,
  },
  vs: {
    fontSize: 15,
    fontFamily: Fonts.medium,
  },
  placeholder: {
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
});
