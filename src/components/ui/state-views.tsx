import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';
import { colors, radius, space } from '@/theme/tokens';

export function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.warning} />
      </View>
      <AppText variant="title" align="center">
        Hit a snag
      </AppText>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        {message ?? 'Something went wrong while loading your money. Your funds are unaffected.'}
      </AppText>
      <PressableScale haptic="medium" onPress={onRetry} style={styles.button} accessibilityLabel="Retry loading">
        <AppText variant="heading" tone="onAccent">
          Try again
        </AppText>
      </PressableScale>
    </View>
  );
}

export function OfflineState({ hasCache, onRetry }: { hasCache: boolean; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>
        <Ionicons name="wifi-outline" size={28} color={colors.info} />
      </View>
      <AppText variant="title" align="center">
        You’re offline
      </AppText>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        {hasCache
          ? 'Showing your last synced snapshot. Numbers may be out of date.'
          : 'Connect to the internet once and we’ll keep a snapshot for next time.'}
      </AppText>
      <PressableScale haptic="medium" onPress={onRetry} style={styles.button} accessibilityLabel="Retry connection">
        <AppText variant="heading" tone="onAccent">
          Retry
        </AppText>
      </PressableScale>
    </View>
  );
}

/** Thin banner pinned above content when rendering a stale offline snapshot. */
export function StaleBanner() {
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Ionicons name="time-outline" size={14} color={colors.warning} />
      <AppText variant="caption" tone="warning">
        Offline — showing last synced data
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    gap: space.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  copy: {
    maxWidth: 280,
  },
  button: {
    marginTop: space.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stroke,
  },
});
