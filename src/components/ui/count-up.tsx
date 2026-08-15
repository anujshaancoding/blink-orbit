import React, { useEffect, useState } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useStore } from '@/data/store';
import { motion } from '@/theme/tokens';

interface Props {
  value: number;
  format: (v: number) => string;
  style?: TextStyle | TextStyle[];
  duration?: number;
  /** Fire once when the count-up lands (e.g. to trigger a haptic tick). */
  onSettled?: () => void;
}

/**
 * Animated number that counts from 0 (or its previous value) to `value`.
 * Honors Reduce Motion by snapping straight to the final value.
 * Formatting runs on the JS thread via state — cheap at ~60 updates total.
 */
export function CountUp({ value, format, style, duration = motion.countUp, onSettled }: Props) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState('');
  const { reducedMotion } = useStore();

  useEffect(() => {
    if (reducedMotion) {
      // Render path shows format(value) directly in this mode — no state needed.
      onSettled?.();
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished && onSettled) runOnJS(onSettled)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reducedMotion]);

  // Formatting happens on the JS thread — `format` is a plain closure and
  // must never run inside the worklet.
  const applyFormat = (v: number) => setDisplay(format(v));
  useAnimatedReaction(
    () => progress.value,
    (p) => {
      runOnJS(applyFormat)(value * p);
    },
  );

  return (
    <Animated.Text maxFontSizeMultiplier={1.4} style={style} numberOfLines={1} adjustsFontSizeToFit>
      {reducedMotion ? format(value) : display || format(0)}
    </Animated.Text>
  );
}
