import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useStore } from '@/data/store';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  haptic?: 'light' | 'medium' | 'success' | 'none';
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/**
 * The app's only press affordance: scale-down on press-in with a spring
 * release, plus haptic feedback. With Reduce Motion on, the scale is
 * replaced by an opacity dip.
 */
export function PressableScale({ haptic = 'light', onPress, style, scaleTo = 0.97, disabled, ...rest }: Props) {
  const pressed = useSharedValue(0);
  const { reducedMotion } = useStore();

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: withTiming(pressed.value ? 0.7 : 1, { duration: motion.fast }) };
    }
    return {
      transform: [{ scale: withSpring(pressed.value ? scaleTo : 1, { damping: 18, stiffness: 320 }) }],
      opacity: withTiming(disabled ? 0.5 : 1, { duration: motion.fast }),
    };
  }, [reducedMotion, disabled, scaleTo]);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (haptic === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      style={[animatedStyle, style]}
    />
  );
}
