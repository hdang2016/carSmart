import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../contexts/ThemeContext';

export function ThemeHeaderToggle() {
  const { resolvedTheme, setMode, colors } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const isDark = resolvedTheme === 'dark';

  const rotateDeg = useMemo(
    () =>
      rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '18deg'],
      }),
    [rotate],
  );

  const animatePress = (toValue: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        friction: 5,
        tension: 180,
      }),
      Animated.timing(opacity, {
        toValue: toValue < 1 ? 0.8 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: toValue < 1 ? 1 : 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateDeg }], opacity }}>
      <Pressable
        onPressIn={() => animatePress(0.9)}
        onPressOut={() => animatePress(1)}
        onPress={() => setMode(isDark ? 'light' : 'dark')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Toggle light and dark mode"
        style={[styles.button, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
      >
        <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  icon: {
    fontSize: 16,
  },
});
