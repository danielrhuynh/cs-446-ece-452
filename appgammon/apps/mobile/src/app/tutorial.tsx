import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BorderRadius, Colors, Fonts, Layout, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { setHasSeenTutorial } from "@/lib/storage";
import { ScreenContainer } from "@/components/ui/screen-container";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";

interface TutorialScoreRow {
  label: string;
  body: string;
  value: string;
}

interface TutorialStep {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  scoreRows?: TutorialScoreRow[];
}

function buildTutorialSteps(openedFromHome: boolean): TutorialStep[] {
  return [
    {
      eyebrow: openedFromHome ? "Refresher" : "Welcome",
      title: openedFromHome ? "Backgammon in four short steps" : "Learn the basics before you play",
      summary: "You only need the flow of the match. Appgammon handles legal moves on the board.",
      bullets: [
        "Matches are usually first to 3, 5, or 7 points.",
        "Each game starts at 1 point.",
        "You can replay this guide from Home any time.",
      ],
    },
    {
      eyebrow: "Movement",
      title: "Move toward home and clear the bar first",
      summary:
        "Use both dice to move your checkers toward your home board. White moves counterclockwise and red moves clockwise.",
      bullets: [
        "Two or more opposing checkers on a point block that point.",
        "A single opposing checker is a blot and can be hit.",
        "If you have a checker on the bar, you must re-enter it before any other move.",
      ],
    },
    {
      eyebrow: "Scoring",
      title: "Bearing off wins the game",
      summary:
        "When all of your checkers are in your home board, you can bear them off. The first player to clear every checker wins.",
      bullets: [
        "A normal win is worth 1 point.",
        "If your opponent has not borne off any checker, it is worth 2 points.",
        "If your opponent still has a checker on the bar or in your home board, it is worth 3 points.",
      ],
      scoreRows: [
        {
          label: "Single",
          body: "Opponent has borne off at least one checker.",
          value: "1",
        },
        {
          label: "Gammon",
          body: "Opponent has not borne off any checkers.",
          value: "2",
        },
        {
          label: "Backgammon",
          body: "Opponent still has a checker on the bar or in your home board.",
          value: "3",
        },
      ],
    },
    {
      eyebrow: "Doubling",
      title: "The cube raises the value of the game",
      summary:
        "Before rolling, you can offer a double. Your opponent accepts and play continues at double value, or passes and loses immediately.",
      bullets: [
        "The game starts at 1x.",
        "Accepted doubles move the cube to 2x, 4x, and higher.",
        "A backgammon at 4x is worth 12 points.",
      ],
    },
  ];
}

function ProgressDots({ count, currentIndex }: { count: number; currentIndex: number }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.progressTrack}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`progress-${index}`}
          style={[
            styles.progressDot,
            {
              backgroundColor: index === currentIndex ? colors.primary : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function TutorialScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { source } = useLocalSearchParams<{ source?: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const openedFromHome = source === "home";
  const tutorialSteps = buildTutorialSteps(openedFromHome);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = tutorialSteps[currentStepIndex];
  const scoreRows = currentStep.scoreRows;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tutorialSteps.length - 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStepIndex]);

  const leaveTutorial = async () => {
    await setHasSeenTutorial(true);
    if (openedFromHome) {
      router.back();
      return;
    }
    router.replace("/");
  };

  const handleNext = async () => {
    if (isLastStep) {
      await leaveTutorial();
      return;
    }
    setCurrentStepIndex((index) => index + 1);
  };

  const handleBack = () => {
    if (isFirstStep) return;
    setCurrentStepIndex((index) => index - 1);
  };

  return (
    <ScreenContainer>
      <View style={styles.shell}>
        <View style={styles.topRail}>
          {openedFromHome ? (
            <BackButton onPress={() => router.back()} label="Home" />
          ) : (
            <Pressable
              onPress={() => void leaveTutorial()}
              accessibilityRole="button"
              accessibilityLabel="Skip tutorial"
              style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            >
              <Text style={[styles.textActionLabel, { color: colors.textMuted }]}>Skip</Text>
            </Pressable>
          )}

          <Text style={[styles.stepCount, { color: colors.textMuted }]}>
            {currentStepIndex + 1}/{tutorialSteps.length}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={`step-${currentStepIndex}`}
            entering={FadeInDown.duration(220)}
            style={styles.contentWrap}
          >
            <View style={styles.hero}>
              <Text style={[styles.eyebrow, { color: colors.secondary }]}>
                {currentStep.eyebrow}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>{currentStep.title}</Text>
              <Text style={[styles.summary, { color: colors.textMuted }]}>
                {currentStep.summary}
              </Text>
              <ProgressDots count={tutorialSteps.length} currentIndex={currentStepIndex} />
            </View>

            <LiquidGlass style={[styles.card, Shadows.sm]}>
              <View style={styles.bulletList}>
                {currentStep.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.bulletText, { color: colors.text }]}>{bullet}</Text>
                  </View>
                ))}
              </View>

              {scoreRows ? (
                <View style={[styles.scoreTable, { borderColor: colors.border }]}>
                  {scoreRows.map((row, index) => (
                    <View
                      key={row.label}
                      style={[
                        styles.scoreRow,
                        index < scoreRows.length - 1 && {
                          borderBottomColor: colors.border,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.scoreCopy}>
                        <Text style={[styles.scoreLabel, { color: colors.text }]}>{row.label}</Text>
                        <Text style={[styles.scoreBody, { color: colors.textMuted }]}>
                          {row.body}
                        </Text>
                      </View>
                      <Text style={[styles.scoreValue, { color: colors.primary }]}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </LiquidGlass>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {!isFirstStep ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Previous tutorial step"
              style={({ pressed }) => [styles.backAction, pressed && styles.pressed]}
            >
              <Text style={[styles.backActionLabel, { color: colors.textMuted }]}>Back</Text>
            </Pressable>
          ) : null}

          <Button
            title={isLastStep ? (openedFromHome ? "Done" : "Start Playing") : "Next"}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => void handleNext()}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  topRail: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  textAction: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  textActionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  stepCount: {
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  scroll: {
    flex: 1,
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  contentWrap: {
    gap: Spacing.md,
  },
  hero: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  eyebrow: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    letterSpacing: -0.5,
  },
  summary: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  progressTrack: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: BorderRadius.full,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  bulletList: {
    gap: Spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  scoreTable: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  scoreCopy: {
    flex: 1,
    gap: 4,
  },
  scoreLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
  },
  scoreBody: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  scoreValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    minWidth: 22,
    textAlign: "right",
  },
  footer: {
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
    alignSelf: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  backAction: {
    alignSelf: "center",
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  backActionLabel: {
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
});
