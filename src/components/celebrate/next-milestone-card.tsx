import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { useStore } from '@/data/store';
import type { Milestone } from '@/lib/milestones';
import { colors, radius, space } from '@/theme/tokens';

/** The next milestone worth chasing, with quiet progress — no countdown pressure. */
export function NextMilestoneCard({ next, achievedCount }: { next: Milestone | null; achievedCount: number }) {
  const { reducedMotion } = useStore();
  const w = useSharedValue(0);
  const progress = next?.progress ?? 1;

  useEffect(() => {
    w.value = reducedMotion ? progress : withTiming(progress, { duration: 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reducedMotion]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.max(2, w.value * 100)}%` }));

  if (!next) {
    return (
      <Card style={styles.card}>
        <AppText variant="heading">All milestones cleared 👑</AppText>
        <AppText variant="caption" tone="secondary">
          {achievedCount} unlocked. The orbit keeps going anyway — that’s the point.
        </AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <AppText style={styles.glyph} accessibilityElementsHidden>
          {next.glyph}
        </AppText>
        <View style={styles.text}>
          <AppText variant="heading">Next: {next.title}</AppText>
          <AppText variant="caption" tone="secondary">
            {next.detail}
          </AppText>
        </View>
        <AppText variant="monoNum" tone="accent">
          {Math.floor(next.progress * 100)}%
        </AppText>
      </View>
      <View
        style={styles.track}
        accessibilityLabel={`${Math.floor(next.progress * 100)} percent toward ${next.title}`}
      >
        <Animated.View style={[styles.fill, fill]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  glyph: {
    fontSize: 26,
    lineHeight: 32,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
