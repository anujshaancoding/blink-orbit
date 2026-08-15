import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useStore } from '@/data/store';
import { colors, radius } from '@/theme/tokens';

export interface SliderMarker {
  /** position 0–1 along the track */
  at: number;
  color: string;
}

interface Props {
  /** starting position, 0–1 (the slider owns its position after mount) */
  initialPosition: number;
  /** discrete steps across the track (e.g. 40 for whole percents) */
  steps: number;
  onStep: (step: number) => void;
  markers?: SliderMarker[];
  accessibilityLabel: string;
  /** step delta for screen-reader increment/decrement */
  a11yStep?: number;
  currentStep: number;
}

/**
 * The app's shared slider: pan on the UI thread, discrete snapping on
 * release, threshold markers, and full screen-reader adjustability.
 */
export function BlinkSlider({
  initialPosition,
  steps,
  onStep,
  markers,
  accessibilityLabel,
  a11yStep = 1,
  currentStep,
}: Props) {
  const { reducedMotion } = useStore();
  const [trackW, setTrackW] = useState(1);
  const position = useSharedValue(initialPosition);

  const pan = Gesture.Pan()
    .onChange((e) => {
      position.value = Math.min(1, Math.max(0, position.value + e.changeX / trackW));
    })
    .onFinalize(() => {
      position.value = withTiming(Math.round(position.value * steps) / steps, { duration: 80 });
    });

  useAnimatedReaction(
    () => Math.round(position.value * steps),
    (v, prev) => {
      if (v !== prev) runOnJS(onStep)(v);
    },
  );

  const thumbStyle = useAnimatedStyle(() => ({ left: `${position.value * 100}%` }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${position.value * 100}%` }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.hit}
        onLayout={(e: LayoutChangeEvent) => setTrackW(Math.max(1, e.nativeEvent.layout.width))}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const delta = e.nativeEvent.actionName === 'increment' ? a11yStep : -a11yStep;
          const next = Math.min(steps, Math.max(0, currentStep + delta));
          position.value = reducedMotion ? next / steps : withTiming(next / steps, { duration: 120 });
          onStep(next);
        }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
          {markers?.map((m, i) => (
            <View key={i} style={[styles.marker, { left: `${m.at * 100}%`, backgroundColor: m.color }]} />
          ))}
        </View>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.cardPressed,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    opacity: 0.9,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -14,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.bg,
  },
});
