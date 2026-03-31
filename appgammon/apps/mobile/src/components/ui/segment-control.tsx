/**
 * Segment control with accessible touch targets (min 44px)
 */

import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Fonts, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SegmentControlProps<T extends string | number | boolean> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labelForOption?: (option: T) => string;
}

export function SegmentControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
  labelForOption,
}: SegmentControlProps<T>) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option === value;
        const label = labelForOption ? labelForOption(option) : String(option);

        return (
          <TouchableOpacity
            key={String(option)}
            onPress={() => onChange(option)}
            style={[
              styles.button,
              {
                backgroundColor: isSelected ? colors.primary : "transparent",
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
          >
            <Text style={[styles.text, { color: isSelected ? colors.onPrimary : colors.text }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  button: {
    minWidth: 48,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
  },
});
