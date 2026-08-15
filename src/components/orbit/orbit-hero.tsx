import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ASSET_COLORS, WealthOrb } from './wealth-orb';
import { AppText } from '@/components/ui/app-text';
import { CountUp } from '@/components/ui/count-up';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import { borrowPower, LAMF, unlockProgress } from '@/lib/finance';
import { inr, inrCompact } from '@/lib/format';
import { colors, radius, space, type } from '@/theme/tokens';

/** Pull distance (px) past which release fires the borrow navigation. */
const SLING_THRESHOLD = 78;
/** Rubber-band asymptote — the orb can never be dragged further than this. */
const SLING_MAX = 130;

/**
 * The hero: orb + centered portfolio value + borrow-power state line.
 * Two ways in to Borrow:
 * - tap the orb
 * - the slingshot: pull the orb down like a launcher; past the threshold a
 *   "release" pill arms (haptic tick), releasing navigates. Rubber-band
 *   resistance means it always springs back. Reduce Motion disables the
 *   gesture entirely (tap still works).
 */
export function OrbitHero({ user }: { user: UserState }) {
  const { width } = useWindowDimensions();
  const { reducedMotion } = useStore();
  const router = useRouter();

  const size = Math.min(Math.max(width - space.xl * 2, 260), 360);
  const progress = unlockProgress(user.portfolioValue);
  const unlocked = progress >= 1;
  const power = borrowPower(user.portfolioValue);
  const drawn = user.activeDraw?.amount ?? 0;
  const available = Math.max(0, power - drawn);

  const pull = useSharedValue(0);
  const armed = useSharedValue(0);

  const goBorrow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/borrow');
  };
  const armTick = () => Haptics.selectionAsync();

  const pan = Gesture.Pan()
    .enabled(!reducedMotion)
    .activeOffsetY(14)
    .failOffsetX([-24, 24])
    .onChange((e) => {
      const y = Math.max(0, e.translationY);
      // Rubber band: approaches SLING_MAX asymptotically.
      pull.value = SLING_MAX * (1 - 1 / (1 + y / SLING_MAX));
      const isArmed = pull.value > SLING_THRESHOLD ? 1 : 0;
      if (isArmed !== armed.value) {
        armed.value = isArmed;
        if (isArmed) runOnJS(armTick)();
      }
    })
    .onEnd(() => {
      if (pull.value > SLING_THRESHOLD) runOnJS(goBorrow)();
      pull.value = withSpring(0, { damping: 14, stiffness: 220 });
      armed.value = 0;
    });

  const tap = Gesture.Tap()
    .maxDeltaY(10)
    .onEnd((_e, success) => {
      if (success) runOnJS(goBorrow)();
    });

  const gesture = Gesture.Race(pan, tap);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pull.value * 0.55 }, { scale: 1 + pull.value * 0.0008 }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [12, SLING_THRESHOLD], [0, 1]),
    transform: [
      { translateY: interpolate(pull.value, [0, SLING_MAX], [-8, 14]) },
      { scale: interpolate(armed.value, [0, 1], [0.96, 1.06]) },
    ],
  }));

  const a11yLabel = unlocked
    ? `Portfolio ${inr(user.portfolioValue)}. Credit line unlocked, ${inr(available)} available. Opens borrow screen.`
    : `Portfolio ${inr(user.portfolioValue)}. ${Math.round(progress * 100)} percent of the way to unlocking your credit line. Opens borrow screen.`;

  return (
    <View style={styles.wrap}>
      {/* Slingshot target pill sits behind the orb and fades in on pull */}
      <Animated.View style={[styles.slingPill, pillStyle]} pointerEvents="none">
        <Ionicons name="flash" size={14} color={colors.onAccent} />
        <AppText variant="monoSm" tone="onAccent">
          {unlocked ? `release → ${inrCompact(available)} in ~5 min` : 'release → your path to credit'}
        </AppText>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={orbStyle}
          accessible
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={reducedMotion ? 'Double tap to open' : 'Double tap to open, or drag down and release'}
        >
          <View style={{ width: size, height: size }}>
            <WealthOrb
              size={size}
              unlockProgress={progress}
              unlocked={unlocked}
              holdings={user.holdings}
              reducedMotion={reducedMotion}
            />
            <View style={styles.centerOverlay} pointerEvents="none">
              <AppText variant="eyebrow" tone="tertiary">
                PORTFOLIO
              </AppText>
              <CountUp
                value={user.portfolioValue}
                format={(v) => (user.portfolioValue >= 1_00_000 ? inrCompact(v) : inr(v))}
                style={[type.display, styles.valueText, { maxWidth: size * 0.52 }]}
              />
              <AppText variant="monoSm" tone={unlocked ? 'accent' : 'secondary'}>
                {unlocked ? `${inrCompact(available)} ready to borrow` : `${Math.round(progress * 100)}% to credit line`}
              </AppText>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Asset legend → per-asset drill-down */}
      {user.holdings.length > 0 && (
        <View style={styles.legend}>
          {user.holdings.map((h) => (
            <PressableScale
              key={h.asset}
              onPress={() => router.push({ pathname: '/asset/[asset]', params: { asset: h.asset } })}
              style={styles.legendItem}
              accessibilityLabel={`${h.label}, ${inr(h.value)}. Opens details.`}
            >
              <View style={[styles.dot, { backgroundColor: ASSET_COLORS[h.asset] }]} />
              <AppText variant="caption" tone="secondary">
                {h.label}
              </AppText>
            </PressableScale>
          ))}
        </View>
      )}

      {!unlocked && user.portfolioValue > 0 && (
        <AppText variant="caption" tone="tertiary" align="center" style={styles.hint}>
          The ring closes at {inrCompact(LAMF.unlockFloor)} — then you can borrow up to 80% without
          selling. {reducedMotion ? '' : 'Try pulling the orb down.'}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.lg,
  },
  slingPill: {
    position: 'absolute',
    top: -6,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  valueText: {
    color: colors.textPrimary,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hint: {
    maxWidth: 300,
  },
});
