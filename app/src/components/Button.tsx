import { Pressable, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../contexts/ThemeContext';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonProps) {
  const { colors } = useAppTheme();

  const getButtonColors = () => {
    switch (variant) {
      case 'danger':
        return {
          background: colors.danger,
          text: colors.textInverse,
        };
      case 'secondary':
        return {
          background: colors.surfaceMuted,
          text: colors.text,
        };
      case 'primary':
      default:
        return {
          background: colors.primary,
          text: colors.textInverse,
        };
    }
  };

  const buttonColors = getButtonColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: buttonColors.background,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={buttonColors.text} />
      ) : (
        <Text style={[styles.buttonText, { color: buttonColors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
