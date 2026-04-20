import { Button, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../theme/theme';

export function ProfileScreen() {
  const { signOut } = useAuth();
  const { mode, setMode, colors } = useAppTheme();

  const configBuildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Platform.OS === 'android'
        ? String(Constants.expoConfig?.android?.versionCode ?? '')
        : undefined;

  const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? 'Unknown';
  const buildNumber = Constants.nativeBuildVersion ?? configBuildNumber ?? 'Unknown';

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

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Software Build</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Version</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{appVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Build</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{buildNumber}</Text>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
