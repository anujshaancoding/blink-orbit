import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { CountUp } from '@/components/ui/count-up';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import { buildRewind, type RewindData } from '@/lib/rewind';
import { inr, inrExact } from '@/lib/format';
import { colors, palette, radius, space, type } from '@/theme/tokens';

const SLIDE_MS = 5000;

interface Slide {
  key: string;
  eyebrow: string;
  render: (d: RewindData) => React.ReactNode;
}

/**
 * The monthly Rewind: a tap-through story of the last 30 days.
 * Slides are data-driven — a sparse month simply has fewer slides, and a
 * withdrawal month gets an honest slide instead of silence.
 */
export default function RewindScreen() {
  const router = useRouter();
  const { user, loadedAt, reducedMotion } = useStore();
  const [index, setIndex] = useState(0);

  const data = useMemo(() => (user ? buildRewind(user, loadedAt) : null), [user, loadedAt]);

  const slides = useMemo<Slide[]>(() => {
    if (!data) return [];
    const s: Slide[] = [];

    if (data.daysSaved === 0) {
      s.push({
        key: 'quiet',
        eyebrow: `${data.monthLabel.toUpperCase()} REWIND`,
        render: () => (
          <>
            <AppText variant="displayXL" align="center">
              A quiet month.
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              No saves in the last 30 days — the orbit paused, not ended. One ₹{user?.dailySip ?? 21}
              restarts it tonight.
            </AppText>
          </>
        ),
      });
      return s;
    }

    s.push({
      key: 'saved',
      eyebrow: `${data.monthLabel.toUpperCase()} REWIND`,
      render: (d) => (
        <>
          <AppText variant="body" tone="secondary" align="center">
            You showed up {d.daysSaved} of {d.daysInWindow} days and put away
          </AppText>
          <CountUp value={d.totalSaved} format={inr} style={[type.displayXL, styles.big]} />
          <AppText variant="body" tone="secondary" align="center">
            without thinking about it once.
          </AppText>
        </>
      ),
    });

    s.push({
      key: 'earned',
      eyebrow: 'WHILE YOU LIVED YOUR LIFE',
      render: (d) => (
        <>
          <AppText variant="body" tone="secondary" align="center">
            your money {d.earned >= 0 ? 'earned' : 'moved'}
          </AppText>
          <CountUp
            value={d.earned}
            format={inrExact}
            style={[type.displayXL, styles.big, { color: d.earned >= 0 ? palette.lime : palette.negative }]}
          />
          <AppText variant="body" tone="secondary" align="center">
            {d.earned >= 0
              ? 'on its own. No spins, no tasks. Just markets and time.'
              : 'A red month — and your daily SIP quietly bought the dip. That’s the whole strategy.'}
          </AppText>
        </>
      ),
    });

    if (data.topAssetLabel) {
      s.push({
        key: 'asset',
        eyebrow: 'MVP OF THE MONTH',
        render: (d) => (
          <>
            <AppText variant="displayXL" align="center" tone="accent">
              {d.topAssetLabel}
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              pulled the hardest for you this month.
            </AppText>
          </>
        ),
      });
    }

    if (data.hasWithdrawal) {
      s.push({
        key: 'withdrawal',
        eyebrow: 'LIFE HAPPENED',
        render: () => (
          <>
            <AppText variant="displayXL" align="center">
              You took some out.
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              That’s what it’s for. No lock-in, no penalty, no guilt — the habit survived the
              withdrawal.
            </AppText>
          </>
        ),
      });
    }

    if (data.streakNow > 0) {
      s.push({
        key: 'streak',
        eyebrow: 'RIGHT NOW',
        render: (d) => (
          <>
            <AppText variant="displayXL" align="center">
              🔥 {d.streakNow} days
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              and counting. Tomorrow’s save is already scheduled.
            </AppText>
          </>
        ),
      });
    }

    s.push({
      key: 'flex',
      eyebrow: 'ONE MORE THING',
      render: (d) => (
        <>
          <AppText variant="displayXL" align="center">
            Worth bragging about?
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            An FD would have paid you {inrExact(d.fdWouldHaveEarned)} on the same deposits. Your
            card has the real numbers — dated and honest.
          </AppText>
        </>
      ),
    });

    return s;
  }, [data, user]);

  // Auto-advance. Paused implicitly by Reduce Motion (tap-only navigation).
  useEffect(() => {
    if (reducedMotion || slides.length === 0) return;
    if (index >= slides.length - 1) return;
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, slides.length, reducedMotion]);

  if (!user || !data || slides.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerFill}>
          <AppText variant="body" tone="secondary">
            Your Rewind unlocks once your money loads.
          </AppText>
          <PressableScale onPress={() => router.back()} style={styles.doneButton}>
            <AppText variant="heading" tone="onAccent">
              Back
            </AppText>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const advance = () => {
    Haptics.selectionAsync();
    if (isLast) router.back();
    else setIndex((i) => i + 1);
  };
  const goBackSlide = () => {
    Haptics.selectionAsync();
    setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* progress bars */}
      <View style={styles.progressRow}>
        {slides.map((s, i) => (
          <View key={s.key} style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: i < index ? '100%' : i === index ? '50%' : '0%' }]} />
          </View>
        ))}
      </View>

      <View style={styles.topBar}>
        <AppText variant="eyebrow" tone="accent">
          {slide.eyebrow}
        </AppText>
        <PressableScale onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close rewind">
          <Ionicons name="close" size={18} color={colors.textPrimary} />
        </PressableScale>
      </View>

      {/* tap zones + slide content */}
      <View style={styles.body}>
        <Animated.View key={slide.key} entering={FadeInUp.duration(350)} style={styles.slideContent}>
          {slide.render(data)}
        </Animated.View>
        <Pressable style={styles.zoneLeft} onPress={goBackSlide} accessibilityLabel="Previous slide" />
        <Pressable style={styles.zoneRight} onPress={advance} accessibilityLabel="Next slide" />
      </View>

      {isLast && (
        <Animated.View entering={FadeIn.delay(250)} style={styles.footer}>
          <PressableScale
            haptic="medium"
            style={styles.doneButton}
            onPress={() => {
              router.back();
              router.push('/share');
            }}
            accessibilityLabel="Open your share card"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.onAccent} />
            <AppText variant="heading" tone="onAccent">
              Get the card
            </AppText>
          </PressableScale>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.forest950,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.cardPressed,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    gap: space.lg,
  },
  zoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '32%',
  },
  zoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '68%',
  },
  big: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  footer: {
    padding: space.xl,
  },
  doneButton: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.xl,
  },
});
