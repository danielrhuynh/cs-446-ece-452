/**
 * Back button with accessible touch target (min 44px)
 */

import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface BackButtonProps {
  onPress: () => void;
  label?: string;
}

export function BackButton({ onPress, label = "Back" }: BackButtonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.backButton}
      activeOpacity={0.8}
      accessibilityLabel={`Go back: ${label}`}
      accessibilityRole="button"
    >
      <LiquidGlass style={[styles.backGlass, Shadows.sm]}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </LiquidGlass>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
  },
  backGlass: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
});
