/**
 * Session code input component with dashed boxes
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
}

export function CodeInput({ length = 6, value, onChange }: CodeInputProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Split value into array of characters
  const codeArray = value.split("").concat(Array(length).fill("")).slice(0, length);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (text: string, index: number) => {
    // Only accept alphanumeric characters
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (sanitized.length === 0) return;

    // Build new code
    const newCodeArray = [...codeArray];
    newCodeArray[index] = sanitized[0];
    const newCode = newCodeArray.join("");
    onChange(newCode);

    // Move to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      const newCodeArray = [...codeArray];

      if (codeArray[index]) {
        // Clear current box
        newCodeArray[index] = "";
      } else if (index > 0) {
        // Move to previous box and clear it
        newCodeArray[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }

      onChange(newCodeArray.join(""));
    }
  };

  return (
    <View style={styles.container}>
      {codeArray.map((char, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.box,
            {
              borderColor:
                focusedIndex === index ? colors.primary : colors.border,
              backgroundColor: colors.inputBackground,
              color: colors.text,
            },
          ]}
          value={char}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  box: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderRadius: BorderRadius.sm,
    borderStyle: "dashed",
    fontSize: 20,
    fontWeight: "700",
  },
});
