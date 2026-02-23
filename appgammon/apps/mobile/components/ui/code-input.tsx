/**
 * Session code input component with direct paste support
 * Flex-based boxes so they scale on smaller screens
 */

import { useRef } from "react";
import { Text, TextInput, Pressable, StyleSheet, View } from "react-native";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
}

export function CodeInput({ length = 6, value, onChange }: CodeInputProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const inputRef = useRef<TextInput | null>(null);

  const codeArray = value.split("").concat(Array(length).fill("")).slice(0, length);
  const half = Math.floor(length / 2);

  const handleChange = (text: string) => {
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);
    onChange(sanitized);
  };

  const renderBox = (char: string, index: number) => {
    const isCurrent = index === value.length && value.length < length;
    const isFilled = index < value.length;

    return (
      <LiquidGlass
        key={index}
        style={[
          styles.boxContainer,
          {
            borderColor: isCurrent ? colors.primary : colors.border,
            borderWidth: isCurrent ? 2 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.boxText,
            {
              color: colors.text,
              opacity: isFilled ? 1 : 0.35,
            },
          ]}
        >
          {char || "\u2022"}
        </Text>
      </LiquidGlass>
    );
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel={`Session code input. ${value.length} of ${length} characters entered.`}
      accessibilityRole="text"
    >
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="ascii-capable"
        returnKeyType="done"
        accessibilityLabel="Session code"
      />

      {/* First half */}
      <View style={styles.group}>
        {codeArray.slice(0, half).map((char, i) => renderBox(char, i))}
      </View>

      <Text style={[styles.separator, { color: colors.textMuted }]}>-</Text>

      {/* Second half */}
      <View style={styles.group}>
        {codeArray.slice(half).map((char, i) => renderBox(char, i + half))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    gap: Spacing.sm,
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    zIndex: 2,
  },
  group: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  boxContainer: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 52,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  boxText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: "center",
  },
});
