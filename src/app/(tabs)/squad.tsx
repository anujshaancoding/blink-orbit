import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, OfflineState, StaleBanner } from '@/components/ui/state-views';
import { useStore } from '@/data/store';
import { buildSquad, type Squad, type SquadMember } from '@/data/squads';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Squads: save with friends, ranked ONLY by consistency (days saved / 30).
 * The research rule made concrete: social pressure on the habit, never on
 * the amount — a ₹21/day student outranks a ₹2,001/day whale who skips.
 */
export default function SquadScreen() {
  const { status, user, errorMessage, isStale, loadedAt, refresh } = useStore();
  const squad = useMemo(
    () => (user ? buildSquad(user.personaId, user, loadedAt) : null),
    [user, loadedAt],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {isStale && <StaleBanner />}
      <View style={styles.header}>
        <AppText variant="eyebrow" tone="accent">
          CONSISTENCY IS THE ONLY SCORE
        </AppText>
        <AppText variant="title">{squad ? squad.name : 'Squad'}</AppText>
      </View>

      {status === 'loading' && (
        <View style={styles.skeletonStack}>
          <Skeleton height={120} />
          <Skeleton height={280} />
        </View>
      )}
      {status === 'error' && <ErrorState message={errorMessage} onRetry={refresh} />}
      {status === 'offline' && !user && <OfflineState hasCache={false} onRetry={refresh} />}
      {(status === 'ready' || (status === 'offline' && user)) && user && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {squad ? <SquadBody squad={squad} /> : <SquadEmpty />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SquadEmpty() {
  const router = useRouter();
  return (
    <View style={styles.stack}>
      <Card accent style={styles.emptyCard}>
        <AppText style={styles.emptyGlyph} accessibilityElementsHidden>
          🛰️
        </AppText>
        <AppText variant="title" align="center">
          Orbits are better together
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          A squad is 3–5 friends who see one number about each other: how many days you showed up
          this month. Not amounts. Not balances. Just the habit.
        </AppText>
        <PressableScale
          haptic="medium"
          style={styles.cta}
          onPress={() => router.push('/share')}
          accessibilityLabel="Invite friends to start a squad"
        >
          <Ionicons name="person-add-outline" size={18} color={colors.onAccent} />
          <AppText variant="heading" tone="onAccent">
            Invite your first friend
          </AppText>
        </PressableScale>
        <AppText variant="caption" tone="tertiary" align="center">
          Your invite is your Blink Card — real numbers, not a referral bribe.
        </AppText>
      </Card>
    </View>
  );
}

function SquadBody({ squad }: { squad: Squad }) {
  const router = useRouter();
  return (
    <View style={styles.stack}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card accent style={styles.pulseCard}>
          <AppText variant="eyebrow" tone="tertiary">
            SQUAD PULSE · LAST 30 DAYS
          </AppText>
          <AppText variant="display" tone="accent">
            {Math.round(squad.squadConsistency * 100)}%
          </AppText>
          <AppText variant="caption" tone="secondary">
            of possible save-days actually happened. Every green cell below is someone showing up.
          </AppText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)}>
        <Card style={styles.board}>
          <AppText variant="heading">This month</AppText>
          {squad.members.map((m, i) => (
            <MemberRow key={m.id} member={m} rank={i + 1} delay={i * 90} />
          ))}
          <AppText variant="caption" tone="tertiary">
            Ranked by days saved out of 30 — never by amount. ₹21/day counts exactly the same as
            ₹2,001/day.
          </AppText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(240)}>
        <PressableScale
          haptic="medium"
          style={styles.cta}
          onPress={() => router.push('/share')}
          accessibilityLabel="Invite another friend"
        >
          <Ionicons name="person-add-outline" size={18} color={colors.onAccent} />
          <AppText variant="heading" tone="onAccent">
            Pull someone into orbit
          </AppText>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

function MemberRow({ member, rank, delay }: { member: SquadMember; rank: number; delay: number }) {
  const { reducedMotion } = useStore();
  const w = useSharedValue(0);
  const target = member.consistency / 30;

  useEffect(() => {
    w.value = reducedMotion ? target : withDelay(delay, withTiming(target, { duration: 700 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.max(2, w.value * 100)}%` }));

  return (
    <View
      style={[styles.memberRow, member.isYou && styles.memberRowYou]}
      accessibilityLabel={`Rank ${rank}: ${member.name}, saved ${member.consistency} of 30 days, ${member.streak} day streak${member.isYou ? '. This is you.' : ''}`}
    >
      <AppText variant="monoNum" tone={rank === 1 ? 'accent' : 'tertiary'} style={styles.rank}>
        {rank}
      </AppText>
      <View style={[styles.avatar, { borderColor: `hsl(${member.hue}, 70%, 60%)` }]}>
        <AppText variant="heading">{member.name.charAt(0)}</AppText>
      </View>
      <View style={styles.memberMain}>
        <View style={styles.memberNameRow}>
          <AppText variant="heading" tone={member.isYou ? 'accent' : 'primary'}>
            {member.isYou ? `${member.name} (you)` : member.name}
          </AppText>
          <AppText variant="monoSm" tone="secondary">
            {member.consistency}/30
          </AppText>
        </View>
        <View style={styles.memberTrack}>
          <Animated.View
            style={[styles.memberFill, { backgroundColor: member.isYou ? colors.accent : colors.cardPressed }, fill]}
          />
        </View>
      </View>
      <View style={styles.streakChip}>
        <Ionicons name="flame" size={12} color={member.streak > 0 ? colors.accent : colors.textTertiary} />
        <AppText variant="monoSm" tone={member.streak > 0 ? 'secondary' : 'tertiary'}>
          {member.streak}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: 2,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  stack: {
    gap: space.lg,
  },
  skeletonStack: {
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xxl,
  },
  emptyGlyph: {
    fontSize: 44,
    lineHeight: 54,
  },
  pulseCard: {
    gap: space.sm,
  },
  board: {
    gap: space.md,
  },
  cta: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
  },
  memberRowYou: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.strokeAccent,
  },
  rank: {
    width: 18,
    textAlign: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    backgroundColor: colors.cardPressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberMain: {
    flex: 1,
    gap: 6,
  },
  memberNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  memberFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
