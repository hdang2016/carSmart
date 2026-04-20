import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import {
  completeReminder,
  deleteReminder,
  listActiveRemindersByUser,
  snoozeReminder,
} from '../../services/reminderService';
import { generateRemindersForExistingMaintenance } from '../../services/reminderMigration';
import { listVehiclesByUser } from '../../services/vehicleService';
import { listMaintenanceByUser } from '../../services/maintenanceService';
import type { Reminder } from '../../types/models';
import { formatMaintenanceType } from '../../utils/maintenance';

export function HomeScreen() {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [expandedReminders, setExpandedReminders] = useState<Set<string>>(new Set());

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return listVehiclesByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return listActiveRemindersByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const maintenanceQuery = useQuery({
    queryKey: ['maintenance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      return listMaintenanceByUser(userId);
    },
    enabled: Boolean(userId),
  });

  // Create vehicle mileage map
  const vehicleMileageMap = new Map(
    vehiclesQuery.data?.map((v) => [v.id!, v.currentMileage ?? 0]) ?? [],
  );

  // Get overdue and due soon reminders
  const overdueReminders =
    remindersQuery.data?.filter((r) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (r.dueDate) {
        const dueDate = new Date(r.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < now) return true;
      }
      if (r.dueMileage) {
        const currentMileage = vehicleMileageMap.get(r.vehicleId) ?? 0;
        if (currentMileage >= r.dueMileage) return true;
      }
      return false;
    }) ?? [];

  const dueSoonReminders =
    remindersQuery.data?.filter((r) => {
      if (overdueReminders.includes(r)) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (r.dueDate) {
        const dueDate = new Date(r.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDue >= 0 && daysUntilDue <= 7) return true;
      }
      if (r.dueMileage) {
        const currentMileage = vehicleMileageMap.get(r.vehicleId) ?? 0;
        const milesUntilDue = r.dueMileage - currentMileage;
        if (milesUntilDue >= 0 && milesUntilDue <= 500) return true;
      }
      return false;
    }) ?? [];

  const activeVehicles = vehiclesQuery.data?.filter((v) => v.isActive) ?? [];
  
  // Get upcoming services (reminders not overdue, sorted by earliest date then by mileage)
  const upcomingServices =
    remindersQuery.data
      ?.filter((r) => !overdueReminders.includes(r) && !dueSoonReminders.includes(r))
      .sort((a, b) => {
        // Sort date-based reminders first by date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        // Date-based reminders come before mileage-only
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        // Sort mileage-only by mileage
        if (a.dueMileage && b.dueMileage) {
          return a.dueMileage - b.dueMileage;
        }
        return 0;
      })
      .slice(0, 5) ?? [];

  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      if (!userId) throw new Error('Not authenticated');
      return completeReminder(reminderId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ reminderId, days }: { reminderId: string; days: number }) => {
      if (!userId) throw new Error('Not authenticated');
      return snoozeReminder(reminderId, userId, days);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return deleteReminder(reminderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
    },
  });

  const handleSnooze = (reminderId: string) => {
    Alert.prompt(
      'Snooze Reminder',
      'How many days would you like to snooze this reminder?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Snooze',
          onPress: (value?: string) => {
            const days = parseInt(value || '1', 10);
            if (isNaN(days) || days < 1) {
              Alert.alert('Invalid Input', 'Please enter a valid number of days (1 or more).');
              return;
            }
            snoozeMutation.mutate({ reminderId, days });
          },
        },
      ],
      'plain-text',
      '1',
    );
  };

  const handleDelete = (reminderId: string, reminderType: string) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete this ${reminderType} reminder?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(reminderId),
        },
      ],
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
        `Created ${count} reminder${count !== 1 ? 's' : ''} based on your maintenance history!`
      );
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to generate reminders. Please try again.');
      console.error('Generate reminders error:', error);
    },
  });

  const toggleReminder = (reminderId: string) => {
    setExpandedReminders((prev) => {
      const next = new Set(prev);
      if (next.has(reminderId)) {
        next.delete(reminderId);
      } else {
        next.add(reminderId);
      }
      return next;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehiclesQuery.data?.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Unknown Vehicle';
  };

  if (vehiclesQuery.isLoading || remindersQuery.isLoading || maintenanceQuery.isLoading) {
    return (
      <ScreenContainer title="Car Smart" subtitle="Your vehicle maintenance dashboard">
        <Text style={{ color: colors.text }}>Loading dashboard...</Text>
      </ScreenContainer>
    );
  }

  const hasMaintenanceRecords = (maintenanceQuery.data?.length ?? 0) > 0;
  const hasReminders = (remindersQuery.data?.length ?? 0) > 0;

  return (
    <ScreenContainer title="Car Smart" subtitle="Your vehicle maintenance dashboard">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {activeVehicles.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Vehicles</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>
              {overdueReminders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Overdue</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{dueSoonReminders.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Due Soon</Text>
          </View>
        </View>

        {/* Overdue Reminders */}
        {overdueReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>
              ⚠️ Overdue Reminders
            </Text>
            {overdueReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                isExpanded={expandedReminders.has(reminder.id!)}
                onToggle={() => toggleReminder(reminder.id!)}
                onComplete={() => completeMutation.mutate(reminder.id!)}
                onSnooze={() => handleSnooze(reminder.id!)}
                onDelete={() => handleDelete(reminder.id!, formatMaintenanceType(reminder.type))}
                vehicleName={getVehicleName(reminder.vehicleId)}
                currentMileage={vehicleMileageMap.get(reminder.vehicleId)}
                formatDate={formatDate}
                colors={colors}
                isOverdue
              />
            ))}
          </View>
        )}

        {/* Due Soon Reminders */}
        {dueSoonReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📅 Due Soon</Text>
            {dueSoonReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                isExpanded={expandedReminders.has(reminder.id!)}
                onToggle={() => toggleReminder(reminder.id!)}
                onComplete={() => completeMutation.mutate(reminder.id!)}
                onSnooze={() => handleSnooze(reminder.id!)}
                onDelete={() => handleDelete(reminder.id!, formatMaintenanceType(reminder.type))}
                vehicleName={getVehicleName(reminder.vehicleId)}
                currentMileage={vehicleMileageMap.get(reminder.vehicleId)}
                formatDate={formatDate}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Upcoming Services */}
        {upcomingServices.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📅 Upcoming Services</Text>
            {upcomingServices.map((reminder) => {
              const currentMileage = vehicleMileageMap.get(reminder.vehicleId) ?? 0;
              const milesRemaining = reminder.dueMileage ? reminder.dueMileage - currentMileage : null;
              
              return (
                <View
                  key={reminder.id}
                  style={[
                    styles.maintenanceCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.maintenanceHeader}>
                    <Text style={[styles.maintenanceType, { color: colors.text }]}>
                      {formatMaintenanceType(reminder.type)}
                    </Text>
                    {reminder.dueDate ? (
                      <Text style={[styles.maintenanceDate, { color: colors.textMuted }]}>
                        {formatDate(reminder.dueDate)}
                      </Text>
                    ) : milesRemaining !== null && milesRemaining > 0 ? (
                      <Text style={[styles.maintenanceDate, { color: colors.textMuted }]}>
                        {milesRemaining.toLocaleString()} mi
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.maintenanceVehicle, { color: colors.textMuted }]}>
                    {getVehicleName(reminder.vehicleId)}
                  </Text>
                  {reminder.dueMileage && (
                    <Text style={[styles.maintenanceMileage, { color: colors.textMuted }]}>
                      📍 Due at {reminder.dueMileage.toLocaleString()} miles
                      {currentMileage > 0 && milesRemaining !== null && milesRemaining > 0 && (
                        <Text style={{ color: colors.primary }}>
                          {' '}• {milesRemaining.toLocaleString()} miles remaining
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {overdueReminders.length === 0 &&
          dueSoonReminders.length === 0 &&
          upcomingServices.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {hasReminders ? 'All caught up! 🎉' : 'No reminders yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {hasReminders
                  ? 'No upcoming services or reminders to show'
                  : hasMaintenanceRecords
                  ? 'Generate reminders based on your maintenance history'
                  : 'Log maintenance to create reminders automatically'}
              </Text>
              {hasMaintenanceRecords && !hasReminders && (
                <View style={{ marginTop: 16 }}>
                  <Button
                    title="Generate Reminders"
                    onPress={() => generateRemindersMutation.mutate()}
                    loading={generateRemindersMutation.isPending}
                    variant="primary"
                  />
                </View>
              )}
            </View>
          )}
      </ScrollView>
    </ScreenContainer>
  );
}

type ReminderCardProps = {
  reminder: Reminder;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onSnooze: () => void;
  onDelete: () => void;
  vehicleName: string;
  currentMileage?: number;
  formatDate: (date: Date) => string;
  colors: any;
  isOverdue?: boolean;
};

function ReminderCard({
  reminder,
  isExpanded,
  onToggle,
  onComplete,
  onSnooze,
  onDelete,
  vehicleName,
  currentMileage,
  formatDate,
  colors,
  isOverdue,
}: ReminderCardProps) {
  return (
    <View
      style={[
        styles.reminderCard,
        {
          backgroundColor: colors.surface,
          borderColor: isOverdue ? colors.danger : colors.border,
          borderWidth: isOverdue ? 2 : 1,
        },
      ]}
    >
      <Pressable onPress={onToggle}>
        <View style={styles.reminderHeader}>
          <View style={styles.reminderInfo}>
            <Text style={[styles.reminderType, { color: colors.text }]}>
              {formatMaintenanceType(reminder.type)}
            </Text>
            <Text style={[styles.reminderVehicle, { color: colors.textMuted }]}>{vehicleName}</Text>
          </View>
          <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>

        <View style={styles.reminderDetails}>
          {reminder.dueDate && (
            <Text style={[styles.reminderDue, { color: isOverdue ? colors.danger : colors.text }]}>
              📅 {formatDate(reminder.dueDate)}
            </Text>
          )}
          {reminder.dueMileage && (
            <Text style={[styles.reminderDue, { color: isOverdue ? colors.danger : colors.text }]}>
              📍 {reminder.dueMileage.toLocaleString()} miles
              {currentMileage !== undefined && ` (current: ${currentMileage.toLocaleString()})`}
            </Text>
          )}
        </View>

        {reminder.message && (
          <Text style={[styles.reminderMessage, { color: colors.textMuted }]}>
            {reminder.message}
          </Text>
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.reminderActions}>
          <View style={styles.actionButton}>
            <Button
              title="✓ Done"
              onPress={onComplete}
              variant="primary"
            />
          </View>
          {reminder.dueDate && (
            <View style={styles.actionButton}>
              <Button
                title="💤 Snooze"
                onPress={onSnooze}
                variant="secondary"
              />
            </View>
          )}
          <View style={styles.actionButton}>
            <Button
              title="🗑️ Remove"
              onPress={onDelete}
              variant="secondary"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  reminderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderVehicle: {
    fontSize: 14,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  reminderDetails: {
    marginTop: 8,
    gap: 4,
  },
  reminderDue: {
    fontSize: 14,
    fontWeight: '500',
  },
  reminderMessage: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  maintenanceCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  maintenanceType: {
    fontSize: 15,
    fontWeight: '600',
  },
  maintenanceDate: {
    fontSize: 13,
  },
  maintenanceVehicle: {
    fontSize: 13,
    marginBottom: 4,
  },
  maintenanceMileage: {
    fontSize: 13,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
});

