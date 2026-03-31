/** Emote display and picker. */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { EMOTES, type EmoteId, type LastEmote } from "@/types/game";

const EMOTE_DURATION_MS = 2000;

interface EmoteAreaProps {
  lastEmote: LastEmote | null;
  emotesMuted: boolean;
  onEmoteSelect?: (emoteId: EmoteId) => void;
  onMuteToggle?: (muted: boolean) => void;
}

export function EmoteArea({ lastEmote, emotesMuted, onEmoteSelect, onMuteToggle }: EmoteAreaProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [showPicker, setShowPicker] = useState(false);
  const [showEmote, setShowEmote] = useState(false);

  useEffect(() => {
    if (!lastEmote || emotesMuted) {
      setShowEmote(false);
      return;
    }
    setShowEmote(true);
    const t = setTimeout(() => setShowEmote(false), EMOTE_DURATION_MS);
    return () => clearTimeout(t);
  }, [lastEmote, emotesMuted]);

  const emote = lastEmote ? EMOTES.find((e) => e.id === lastEmote.emoteId) : null;

  return (
    <View style={styles.container}>
      {/* Emote display */}
      {showEmote && lastEmote && !emotesMuted && emote && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(300)}
          style={styles.display}
        >
          <LiquidGlass
            style={[
              styles.emoteBubble,
              {
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Text style={styles.emoteLabel}>{emote.label}</Text>
          </LiquidGlass>
        </Animated.View>
      )}

      {/* Mute toggle */}
      {onMuteToggle && (
        <TouchableOpacity onPress={() => onMuteToggle(!emotesMuted)} style={styles.muteButton}>
          <Text style={[styles.muteLabel, { color: colors.textMuted }]}>
            {emotesMuted ? "Unmute" : "Mute"} emotes
          </Text>
        </TouchableOpacity>
      )}

      {/* Emote picker button */}
      {onEmoteSelect && (
        <TouchableOpacity
          onPress={() => setShowPicker(!showPicker)}
          activeOpacity={0.7}
          style={styles.pickerButton}
        >
          <LiquidGlass
            style={[
              styles.pickerButtonInner,
              {
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Text style={[styles.pickerLabel, { color: colors.text }]}>😊</Text>
          </LiquidGlass>
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
            <LiquidGlass style={[styles.pickerModal, { borderColor: colors.glassBorder }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Send Emote</Text>
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
                    <LiquidGlass
                      style={[styles.emoteOptionInner, { borderColor: colors.glassBorder }]}
                    >
                      <Text style={styles.emoteLabel}>{e.label}</Text>
                    </LiquidGlass>
                  </TouchableOpacity>
                ))}
              </View>
            </LiquidGlass>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  display: {
    position: "absolute",
    top: -40,
  },
  emoteBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  emoteLabel: {
    fontSize: 20,
  },
  pickerButton: {
    padding: Spacing.xs,
  },
  pickerButtonInner: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    borderRadius: BorderRadius.lg,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  muteButton: {
    paddingVertical: Spacing.xs,
  },
  muteLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
});
