import { Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../theme/theme';

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { mode, setMode, colors } = useAppTheme();

  const options: ThemeMode[] = ['light', 'system', 'dark'];

  return (
    <ScreenContainer
      title="Profile"
      subtitle="Account settings and appearance."
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Choose a theme mode</Text>
        <View style={styles.themeOptions}>
          {options.map((option) => {
            const isActive = mode === option;

            return (
              <Pressable
                key={option}
                style={[
                  styles.themePill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceMuted,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMode(option)}
              >
                <Text style={{ color: isActive ? colors.textInverse : colors.text }}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button title="Sign Out" onPress={() => void signOut()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
