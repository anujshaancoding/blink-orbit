import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CelebrationOverlay } from '@/components/celebrate/celebration-overlay';
import { NextMilestoneCard } from '@/components/celebrate/next-milestone-card';
import { OrbitHero } from '@/components/orbit/orbit-hero';
import { PulseCard } from '@/components/pulse/pulse-card';
import { StreakCard } from '@/components/pulse/streak-card';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, OfflineState, StaleBanner } from '@/components/ui/state-views';
import { useStore } from '@/data/store';
import type { UserState } from '@/data/types';
import { projectDailySip } from '@/lib/finance';
import { inrCompact } from '@/lib/format';
import { computeMilestones, nextMilestone, uncelebrated } from '@/lib/milestones';
import { colors, radius, space } from '@/theme/tokens';

export default function OrbitScreen() {
  const { status, user, errorMessage, isStale, refresh } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {isStale && <StaleBanner />}
      <Header />
      {status === 'loading' && <OrbitSkeleton />}
      {status === 'error' && <ErrorState message={errorMessage} onRetry={refresh} />}
      {status === 'offline' && !user && <OfflineState hasCache={false} onRetry={refresh} />}
      {(status === 'ready' || (status === 'offline' && user)) && user && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.accent} />
          }
        >
          {user.portfolioValue <= 0 ? <DayZero user={user} /> : <Ready user={user} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header() {
  const router = useRouter();
  const { user } = useStore();
  return (
    <View style={styles.header}>
      <View>
        <AppText variant="eyebrow" tone="accent">
          BLINKMONEY
        </AppText>
        <AppText variant="title">{user ? `Hi ${user.name}` : 'Orbit'}</AppText>
      </View>
      <View style={styles.headerActions}>
        <PressableScale
          onPress={() => router.push('/share')}
          style={styles.iconButton}
          accessibilityLabel="Share your milestone card"
        >
          <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
        </PressableScale>
        <PressableScale
          onPress={() => router.push('/debug')}
          style={styles.iconButton}
          accessibilityLabel="Open demo controls"
        >
          <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
        </PressableScale>
      </View>
    </View>
  );
}

function Ready({ user }: { user: UserState }) {
  const { loadedAt, seenMilestones, markCelebrated, sipPausedUntil } = useStore();
  const router = useRouter();

  const milestones = useMemo(() => computeMilestones(user, loadedAt), [user, loadedAt]);
  const next = useMemo(() => nextMilestone(milestones), [milestones]);
  const achieved = milestones.filter((m) => m.achieved);
  const fresh = uncelebrated(milestones, seenMilestones);

  // Celebrate only the biggest fresh milestone; older ones are marked
  // silently (they were "achieved before the feature existed" in demo terms).
  const toCelebrate = fresh.length > 0 ? fresh[fresh.length - 1] : null;

  const sipPaused = sipPausedUntil !== null && sipPausedUntil > loadedAt;

  return (
    <View style={styles.stack}>
      {toCelebrate && (
        <CelebrationOverlay
          milestone={toCelebrate}
          onDone={() => markCelebrated(fresh.map((m) => m.id))}
        />
      )}

      <Animated.View entering={FadeInDown.duration(400)}>
        <OrbitHero user={user} />
      </Animated.View>

      {sipPaused && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <PressableScale onPress={() => router.push('/sip')} accessibilityLabel="SIP paused. Manage SIP.">
            <Card style={styles.pausedCard}>
              <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
              <AppText variant="caption" tone="warning" style={styles.pausedText}>
                SIP paused — tap to manage or resume
              </AppText>
            </Card>
          </PressableScale>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <PulseCard user={user} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(180)}>
        <RewindTeaser />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(260)}>
        <StreakCard user={user} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(340)}>
        <NextMilestoneCard next={next} achievedCount={achieved.length} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(420)}>
        <PressableScale onPress={() => router.push('/sip')} accessibilityLabel="Manage your SIP">
          <Card style={styles.sipRow}>
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            <View style={styles.sipRowText}>
              <AppText variant="heading">Manage SIP</AppText>
              <AppText variant="caption" tone="tertiary">
                Pause, resume — two taps, no support ticket
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Card>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

function RewindTeaser() {
  const router = useRouter();
  const { loadedAt } = useStore();
  const month = new Date(loadedAt).toLocaleDateString('en-IN', { month: 'long' });
  return (
    <PressableScale
      haptic="medium"
      onPress={() => router.push('/rewind')}
      accessibilityLabel={`Watch your ${month} rewind`}
    >
      <Card accent style={styles.rewindCard}>
        <View style={styles.rewindText}>
          <AppText variant="eyebrow" tone="accent">
            30-DAY STORY
          </AppText>
          <AppText variant="heading">Your {month} Rewind is ready</AppText>
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={18} color={colors.onAccent} />
        </View>
      </Card>
    </PressableScale>
  );
}

/**
 * Day-0 empty state: no fake numbers, no confetti — a clear picture of what
 * starts tomorrow morning and one honest projection.
 */
function DayZero({ user }: { user: UserState }) {
  const at10y = projectDailySip(user.dailySip, 12, 10);
  return (
    <View style={styles.stack}>
      <OrbitHero user={user} />
      <Card accent style={styles.dayZeroCard}>
        <AppText variant="eyebrow" tone="accent">
          DAY 0
        </AppText>
        <AppText variant="title">Your first ₹{user.dailySip} moves tonight</AppText>
        <AppText variant="body" tone="secondary">
          Every morning by 7 AM, ₹{user.dailySip} spreads itself across stocks, FD, gold, real estate
          and F&O. The orb fills as your money grows — and at ₹50K, your credit line unlocks.
        </AppText>
        <View style={styles.projRow}>
          <AppText variant="monoSm" tone="tertiary">
            ₹{user.dailySip}/day for 10 years ≈{' '}
          </AppText>
          <AppText variant="monoNum" tone="accent">
            {inrCompact(at10y)}
          </AppText>
        </View>
        <AppText variant="caption" tone="tertiary">
          Assuming 12% p.a. — not a guarantee, just arithmetic. Markets move both ways.
        </AppText>
      </Card>
    </View>
  );
}

function OrbitSkeleton() {
  return (
    <View style={[styles.stack, styles.skeletonWrap]}>
      <View style={styles.skeletonOrb}>
        <Skeleton width={280} height={280} round />
      </View>
      <Skeleton height={120} />
      <Skeleton height={96} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  stack: {
    gap: space.lg,
  },
  skeletonWrap: {
    paddingHorizontal: space.xl,
  },
  skeletonOrb: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
  dayZeroCard: {
    gap: space.md,
  },
  projRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pausedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
  },
  pausedText: {
    flex: 1,
  },
  rewindCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rewindText: {
    flex: 1,
    gap: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  sipRowText: {
    flex: 1,
    gap: 2,
  },
});
