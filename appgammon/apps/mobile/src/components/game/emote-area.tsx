/** Emote picker control. */

import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { Colors, BorderRadius, Fonts, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { EMOTES, type EmoteId } from "@/types/game";

interface EmoteAreaProps {
  onEmoteSelect?: (emoteId: EmoteId) => void;
}

export function EmoteArea({ onEmoteSelect }: EmoteAreaProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [showPicker, setShowPicker] = useState(false);
  const showPickerTrigger = !!onEmoteSelect;

  return (
    <View style={styles.container}>
      {showPickerTrigger && (
        <TouchableOpacity
          onPress={() => setShowPicker(!showPicker)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open reaction picker"
        >
          <View
            style={[
              styles.triggerTile,
              Shadows.sm,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.triggerEmoji}>😊</Text>
            <Text style={[styles.triggerLabel, { color: colors.text }]}>React</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Emote picker modal */}
      <Modal
        visible={showPicker && !!onEmoteSelect}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <Pressable>
            <View
              style={[
                styles.pickerModal,
                Shadows.md,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pickerTitle, { color: colors.text }]}>React</Text>
              <View style={styles.pickerGrid}>
                {EMOTES.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => {
                      onEmoteSelect?.(e.id);
                      setShowPicker(false);
                    }}
                    activeOpacity={0.7}
                    style={styles.emoteOption}
                  >
                    <View
                      style={[
                        styles.emoteOptionInner,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.emoteLabel,
                          e.id === "gg" && styles.textEmoteLabel,
                          e.id === "gg" && { color: colors.text },
                        ]}
                      >
                        {e.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  triggerTile: {
    width: 76,
    minHeight: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  triggerEmoji: {
    fontSize: 20,
  },
  triggerLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    margin: Spacing.xl,
    minWidth: 260,
    alignItems: "center",
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.md,
  },
  pickerGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emoteOption: {
    padding: Spacing.xs,
  },
  emoteOptionInner: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  emoteLabel: {
    fontSize: 20,
  },
  textEmoteLabel: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
});
