/**
 * Session code display component
 */

import { Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { formatSessionCode } from "@/lib/format";

interface CodeDisplayProps {
  code: string;
}

export function CodeDisplay({ code }: CodeDisplayProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const formattedCode = formatSessionCode(code);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
  };

  return (
    <TouchableOpacity
      onPress={handleCopy}
      activeOpacity={0.7}
      accessibilityLabel={`Session code: ${formattedCode}. Tap to copy.`}
      accessibilityRole="button"
    >
      <LiquidGlass
        style={[
          styles.container,
          {
            borderColor: colors.primary,
          },
        ]}
      >
        <Text style={[styles.code, { color: colors.primary }]}>{formattedCode}</Text>
      </LiquidGlass>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Tap to copy</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  code: {
    fontSize: 32,
    fontFamily: Fonts.display,
    letterSpacing: 6,
  },
  hint: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
