/**
 * Home/Landing Screen
 * Wireframe 1: Logo, display name input, Create/Join buttons
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getDisplayName, setDisplayName } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [displayNameValue, setDisplayNameValue] = useState("");
  const [error, setError] = useState("");

  // Load saved display name on mount
  useEffect(() => {
    async function loadDisplayName() {
      const savedName = await getDisplayName();
      if (savedName) {
        setDisplayNameValue(savedName);
      }
    }
    loadDisplayName();
  }, []);

  const handleCreateGame = async () => {
    if (!displayNameValue.trim()) {
      setError("Please enter a display name");
      return;
    }

    setError("");
    await setDisplayName(displayNameValue.trim());
    router.push({
      pathname: "/create",
      params: { displayName: displayNameValue.trim() },
    });
  };

  const handleJoinGame = async () => {
    if (!displayNameValue.trim()) {
      setError("Please enter a display name");
      return;
    }

    setError("");
    await setDisplayName(displayNameValue.trim());
    router.push({
      pathname: "/join",
      params: { displayName: displayNameValue.trim() },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={[styles.title, { color: colors.text }]}>
              BACKGAMMON
            </Text>
            <View style={[styles.logoCircle, { borderColor: colors.primary }]}>
              <Text style={[styles.logoText, { color: colors.primary }]}>BG</Text>
            </View>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Input
              placeholder="Enter display name..."
              value={displayNameValue}
              onChangeText={(text) => {
                setDisplayNameValue(text);
                if (error) setError("");
              }}
              error={error}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          {/* Buttons Section */}
          <View style={styles.buttonSection}>
            <Button
              title="Create Game"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleCreateGame}
            />
            <Button
              title="Join Game"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={handleJoinGame}
            />
          </View>

          {/* Footer */}
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            No account needed
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
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "700",
  },
  inputSection: {
    width: "100%",
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  buttonSection: {
    width: "100%",
    maxWidth: 300,
    gap: Spacing.md,
  },
  footer: {
    marginTop: Spacing.xl,
    fontSize: 14,
  },
});
