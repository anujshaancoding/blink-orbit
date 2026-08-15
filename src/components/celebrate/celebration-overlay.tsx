import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import type { Milestone } from '@/lib/milestones';
import { colors, palette, radius, space } from '@/theme/tokens';

const CONFETTI_COLORS = [palette.lime, palette.limeBright, palette.warning, palette.info, palette.white];
const PARTICLES = 22;

/**
 * Full-screen celebration for a newly achieved milestone. One at a time,
 * confetti only when motion is allowed, and the primary action is the
 * share loop — pride is the referral engine.
 */
export function CelebrationOverlay({
  milestone,
  onDone,
}: {
  milestone: Milestone;
  onDone: () => void;
}) {
  const router = useRouter();
  const { reducedMotion } = useStore();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [milestone.id]);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDone}>
      <View style={styles.scrim}>
        {!reducedMotion && <ConfettiBurst seed={milestone.id.length} />}
        <Animated.View entering={reducedMotion ? FadeIn.duration(150) : ZoomIn.springify().damping(14)} style={styles.card}>
          <AppText style={styles.glyph} accessibilityElementsHidden>
            {milestone.glyph}
          </AppText>
          <AppText variant="eyebrow" tone="accent">
            MILESTONE
          </AppText>
          <AppText variant="display" align="center">
            {milestone.title}
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            {milestone.detail}
          </AppText>

          <PressableScale
            haptic="success"
            style={styles.primary}
            onPress={() => {
              onDone();
              router.push('/share');
            }}
            accessibilityLabel="Share this milestone"
          >
            <AppText variant="heading" tone="onAccent">
              Share the proof
            </AppText>
          </PressableScale>
          <PressableScale haptic="light" style={styles.secondary} onPress={onDone} accessibilityLabel="Continue">
            <AppText variant="body" tone="secondary">
              Keep orbiting
            </AppText>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Lightweight confetti: N absolutely-positioned chips on spring/timing arcs. */
function ConfettiBurst({ seed }: { seed: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        // Cheap deterministic pseudo-random per particle.
        const r1 = frac(Math.sin(seed * 97 + i * 13.37) * 43758.5453);
        const r2 = frac(Math.sin(seed * 31 + i * 7.77) * 24634.6345);
        const r3 = frac(Math.sin(seed * 17 + i * 3.33) * 56445.2345);
        return {
          key: i,
          x: (r1 - 0.5) * 320,
          y: -(120 + r2 * 380),
          rot: (r3 - 0.5) * 720,
          delay: Math.floor(r2 * 180),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: 6 + r1 * 6,
          h: 10 + r3 * 8,
        };
      }),
    [seed],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(({ key, ...p }) => (
        <Particle key={key} {...p} />
      ))}
    </View>
  );
}

function frac(n: number) {
  return n - Math.floor(n);
}

function Particle({
  x,
  y,
  rot,
  delay,
  color,
  w,
  h,
}: {
  x: number;
  y: number;
  rot: number;
  delay: number;
  color: string;
  w: number;
  h: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: x * t.value },
      // Up then gravity down.
      { translateY: y * t.value + 560 * t.value * t.value },
      { rotate: `${rot * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color, width: w, height: h },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: palette.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.strokeAccent,
    padding: space.xxl,
    alignItems: 'center',
    gap: space.md,
  },
  glyph: {
    fontSize: 56,
    lineHeight: 68,
  },
  primary: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
    marginTop: space.md,
  },
  secondary: {
    paddingVertical: space.sm,
  },
  particle: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    borderRadius: 2,
  },
});
