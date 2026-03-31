/**
 * Custom Input component
 * Larger touch target and font size for accessibility
 */

import { TextInput, View, Text, StyleSheet, type TextInputProps } from "react-native";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <LiquidGlass
        style={[
          styles.inputContainer,
          {
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
      </LiquidGlass>
      {error && (
        <Text style={[styles.error, { color: colors.error }]} accessibilityLiveRegion="assertive">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  input: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    fontSize: 17,
    fontFamily: Fonts.sans,
    minHeight: 50,
  },
  error: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginTop: Spacing.xs,
  },
});
