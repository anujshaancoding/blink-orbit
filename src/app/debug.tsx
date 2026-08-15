import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useStore } from '@/data/store';
import { PERSONAS } from '@/data/types';
import { colors, radius, space } from '@/theme/tokens';

const LATENCIES = [
  { label: 'Instant', ms: 0 },
  { label: 'Realistic', ms: 900 },
  { label: 'Slow 3G', ms: 3500 },
];

/**
 * Demo controls — the honest way to prove every state exists.
 * Reviewers can reproduce loading, error, offline and all five personas
 * live, instead of trusting screenshots.
 */
export default function DebugScreen() {
  const router = useRouter();
  const { debug, updateDebug, setPersona, reducedMotion } = useStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow" tone="accent">
            DEMO CONTROLS
          </AppText>
          <AppText variant="title">Every state, on demand</AppText>
        </View>
        <PressableScale onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.block}>
          <AppText variant="heading">Persona</AppText>
          {PERSONAS.map((p) => {
            const active = debug.personaId === p.id;
            return (
              <PressableScale
                key={p.id}
                onPress={() => setPersona(p.id)}
                style={[styles.personaRow, active && styles.personaActive]}
                accessibilityLabel={`Switch to persona ${p.label}`}
              >
                <View style={styles.personaText}>
                  <AppText variant="heading" tone={active ? 'accent' : 'primary'}>
                    {p.label}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {p.blurb}
                  </AppText>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </PressableScale>
            );
          })}
        </Card>

        <Card style={styles.block}>
          <AppText variant="heading">Network</AppText>
          <View style={styles.chipRow}>
            {LATENCIES.map((l) => {
              const active = debug.latencyMs === l.ms;
              return (
                <PressableScale
                  key={l.ms}
                  onPress={() => updateDebug({ latencyMs: l.ms })}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityLabel={`Set latency to ${l.label}`}
                >
                  <AppText variant="caption" tone={active ? 'onAccent' : 'secondary'}>
                    {l.label}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="body">Fail next request</AppText>
              <AppText variant="caption" tone="tertiary">
                Shows the error state once, then auto-heals on retry.
              </AppText>
            </View>
            <Switch
              value={debug.failNext}
              onValueChange={(v) => updateDebug({ failNext: v })}
              trackColor={{ true: colors.accentDim, false: colors.cardPressed }}
              thumbColor={debug.failNext ? colors.accent : colors.textTertiary}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="body">Offline mode</AppText>
              <AppText variant="caption" tone="tertiary">
                Serves the cached snapshot with a stale banner — or the no-cache empty state.
              </AppText>
            </View>
            <Switch
              value={debug.offline}
              onValueChange={(v) => updateDebug({ offline: v })}
              trackColor={{ true: colors.accentDim, false: colors.cardPressed }}
              thumbColor={debug.offline ? colors.accent : colors.textTertiary}
            />
          </View>
        </Card>

        <Card style={styles.block}>
          <AppText variant="heading">Accessibility</AppText>
          <AppText variant="caption" tone="secondary">
            Reduce Motion is read from system settings and is currently{' '}
            <AppText variant="caption" tone={reducedMotion ? 'accent' : 'tertiary'}>
              {reducedMotion ? 'ON — animations are static' : 'OFF'}
            </AppText>
            . Toggle it in your OS settings to see the app adapt live.
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: space.xl,
    paddingTop: 0,
    gap: space.lg,
  },
  block: {
    gap: space.md,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  personaActive: {
    borderWidth: 1,
    borderColor: colors.strokeAccent,
  },
  personaText: {
    flex: 1,
    gap: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
});
