import { Text, StyleSheet, ActivityIndicator } from "react-native";
import { Colors, Fonts, Spacing, BorderRadius, Layout, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface LoadingCardProps {
  message?: string;
}

export function LoadingCard({ message }: LoadingCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <LiquidGlass style={[styles.card, Shadows.md]} accessibilityLabel={message || "Loading"}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      )}
    </LiquidGlass>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: Layout.cardMaxWidth,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 17,
    fontFamily: Fonts.medium,
  },
});
