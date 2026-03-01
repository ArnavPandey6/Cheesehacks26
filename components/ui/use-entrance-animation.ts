import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useEntranceAnimation(duration = 450, offset = 18) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [duration, opacity, translateY]);

  return {
    opacity,
    transform: [{ translateY }],
  };
}
