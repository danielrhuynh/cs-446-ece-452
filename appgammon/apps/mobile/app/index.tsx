/**
 * Home / Landing Screen
 * Logo, display name input, Create / Join buttons
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getDisplayName, getHasSeenTutorial, setDisplayName } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScreenContainer } from "@/components/ui/screen-container";

export default function HomeScreen() {
  const router = useRouter();
  const { pendingSessionCode } = useLocalSearchParams<{ pendingSessionCode?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [displayNameValue, setDisplayNameValue] = useState("");
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      const savedName = await getDisplayName();
      if (savedName) setDisplayNameValue(savedName);

      const hasSeenTutorial = await getHasSeenTutorial();
      if (!hasSeenTutorial) {
        router.replace("/tutorial" as never);
        return;
      }

      setIsReady(true);
    }
    void loadHomeData();
  }, [router]);

  const validate = () => {
    if (!displayNameValue.trim()) {
      setError("Please enter a display name");
      return false;
    }
    setError("");
    return true;
  };

  const handleCreateGame = async () => {
    if (!validate()) return;
    await setDisplayName(displayNameValue.trim());
    router.push({ pathname: "/create", params: { displayName: displayNameValue.trim() } });
  };

  const handleJoinGame = async () => {
    if (!validate()) return;
    await setDisplayName(displayNameValue.trim());
    router.push({
      pathname: "/join",
      params: { displayName: displayNameValue.trim(), sessionCode: pendingSessionCode },
    });
  };

  if (!isReady) {
    return (
      <ScreenContainer>
        <View style={styles.loadingState} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Animated.View
              entering={FadeIn.duration(500)}
              style={[styles.logoCircle, { borderColor: colors.primary }]}
            >
              <Text style={[styles.logoText, { color: colors.primary }]}>AG</Text>
            </Animated.View>
            <Animated.Text
              entering={FadeIn.delay(80).duration(400)}
              style={[styles.title, { color: colors.text }]}
            >
              Appgammon
            </Animated.Text>
            <Animated.Text
              entering={FadeIn.delay(160).duration(400)}
              style={[styles.subtitle, { color: colors.textMuted }]}
            >
              Play with friends — no account needed
            </Animated.Text>
          </View>

          {/* Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(380)} style={styles.cardWrap}>
            <LiquidGlass style={[styles.mainCard, Shadows.md]}>
              <View style={styles.inputSection}>
                <Input
                  label="Your display name"
                  placeholder="e.g. John"
                  value={displayNameValue}
                  onChangeText={(text) => {
                    setDisplayNameValue(text);
                    if (error) setError("");
                  }}
                  error={error}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={20}
                  accessibilityLabel="Display name"
                  accessibilityHint="Enter the name others will see during the game"
                />
              </View>

              <View style={styles.buttonSection}>
                <Button
                  title="Create Game"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleCreateGame}
                  accessibilityLabel="Create a new game"
                  accessibilityHint="Creates a new session and gives you a code to share"
                />
                <Button
                  title="Join Game"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onPress={handleJoinGame}
                  accessibilityLabel="Join an existing game"
                  accessibilityHint="Enter a code from a friend to join their game"
                />
                <Button
                  title="Replay tutorial"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={() =>
                    router.push({ pathname: "/tutorial" as never, params: { source: "home" } })
                  }
                  accessibilityLabel="Open the backgammon tutorial again"
                  accessibilityHint="Shows rules and scoring on a separate screen"
                />
              </View>
            </LiquidGlass>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
  },
  logoSection: { alignItems: "center", gap: Spacing.sm },
  title: {
    fontSize: 32,
    fontFamily: Fonts.display,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    marginTop: Spacing.xs,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  logoText: { fontSize: 32, fontFamily: Fonts.display },
  cardWrap: { width: "100%", maxWidth: Layout.cardMaxWidth },
  mainCard: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  inputSection: { width: "100%", marginBottom: Spacing.md },
  buttonSection: { width: "100%", gap: Spacing.sm },
  loadingState: { flex: 1 },
});
