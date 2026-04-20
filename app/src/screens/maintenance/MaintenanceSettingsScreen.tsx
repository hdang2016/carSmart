import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/Button';
import {
  getUserIntervals,
  saveAllIntervals,
  resetToDefaults,
  DEFAULT_INTERVALS,
  getMaintenanceTypeName,
} from '../../services/intervalService';
import { generateRemindersForExistingMaintenance } from '../../services/reminderMigration';
import { MAINTENANCE_TYPES } from '../../types/maintenance';
import type { MaintenanceType } from '../../types/maintenance';

interface IntervalData {
  type: MaintenanceType;
  mileageInterval: string;
  monthsInterval: string;
}

export function MaintenanceSettingsScreen() {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intervals, setIntervals] = useState<IntervalData[]>([]);

  useEffect(() => {
    loadIntervals();
  }, []);

  const loadIntervals = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const userIntervals = await getUserIntervals(userId);

      // Initialize with user intervals or defaults (exclude 'other' type)
      const data: IntervalData[] = MAINTENANCE_TYPES
        .filter((type) => type !== 'other')
        .map((type) => {
          const existing = userIntervals.find((i) => i.type === type);
          if (existing) {
            return {
              type,
              mileageInterval: String(existing.mileageInterval || ''),
              monthsInterval: String(existing.monthsInterval || ''),
            };
          }
          // Use defaults
          const defaults = DEFAULT_INTERVALS[type];
          return {
            type,
            mileageInterval: String(defaults.mileageInterval || ''),
            monthsInterval: String(defaults.monthsInterval || ''),
          };
        });

      setIntervals(data);
    } catch (error) {
      console.error('Error loading intervals:', error);
      Alert.alert('Error', 'Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);

      const dataToSave = intervals.map((item) => ({
        type: item.type,
        mileageInterval: parseInt(item.mileageInterval) || 0,
        monthsInterval: parseInt(item.monthsInterval) || 0,
      }));

      await saveAllIntervals(userId, dataToSave);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving intervals:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all intervals to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              setSaving(true);
              await resetToDefaults(userId);
              await loadIntervals();
              Alert.alert('Success', 'Settings reset to defaults!');
            } catch (error) {
              console.error('Error resetting:', error);
              Alert.alert('Error', 'Failed to reset settings. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const generateRemindersMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return generateRemindersForExistingMaintenance(userId);
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
      Alert.alert(
        'Success',
        count > 0
          ? `Created ${count} reminder${count !== 1 ? 's' : ''} based on your maintenance history!`
          : 'No new reminders needed. Your existing reminders are up to date.'
      );
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to generate reminders. Please try again.');
      console.error('Generate reminders error:', error);
    },
  });

  const handleGenerateReminders = () => {
    Alert.alert(
      'Generate Reminders',
      'This will create reminders for your maintenance history based on your current interval settings. Existing reminders will not be duplicated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => generateRemindersMutation.mutate(),
        },
      ]
    );
  };

  const updateInterval = (type: MaintenanceType, field: 'mileageInterval' | 'monthsInterval', value: string) => {
    setIntervals((prev) =>
      prev.map((item) =>
        item.type === type
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

 return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Service Intervals
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Configure default intervals for each service type. When you log maintenance, 
            the app will automatically create reminders based on these settings.
          </Text>
        </View>

        {intervals.map((item) => (
          <View
            key={item.type}
            style={[
              styles.intervalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.serviceTypeName, { color: colors.text }]}>
              {getMaintenanceTypeName(item.type)}
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Mileage Interval
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={item.mileageInterval}
                    onChangeText={(value) => updateInterval(item.type, 'mileageInterval', value)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.unit, { color: colors.textMuted }]}>
                    miles
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Time Interval
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    value={item.monthsInterval}
                    onChangeText={(value) => updateInterval(item.type, 'monthsInterval', value)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.unit, { color: colors.textMuted }]}>
                    months
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.buttonContainer}>
          <Button
            title="Save Settings"
            onPress={handleSave}
            loading={saving}
            variant="primary"
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Generate Reminders from History"
            onPress={handleGenerateReminders}
            loading={generateRemindersMutation.isPending}
            disabled={saving}
            variant="secondary"
          />
          <View style={styles.buttonSpacer} />
          <Button
            title="Reset to Defaults"
            onPress={handleReset}
            disabled={saving || generateRemindersMutation.isPending}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  intervalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  serviceTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputRow: {
    gap: 12,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  unit: {
    fontSize: 14,
    width: 60,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  buttonSpacer: {
    height: 12,
  },
});
