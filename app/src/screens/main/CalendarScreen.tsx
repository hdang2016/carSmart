import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import {
  mergeCalendarItems,
  type CalendarItem,
} from '../../services/calendarService';
import { listMaintenanceByUser } from '../../services/maintenanceService';
import {
  completeReminder,
  deleteReminder,
  isReminderOverdue,
  listRemindersByUser,
  snoozeReminder,
} from '../../services/reminderService';
import { listVehiclesByUser } from '../../services/vehicleService';
import { formatMaintenanceType } from '../../utils/maintenance';

type TimelineFilter = 'all' | 'maintenance' | 'reminder';

type DayGroup = {
  dateKey: string;
  date: Date;
  items: CalendarItem[];
};

const FILTER_OPTIONS: Array<{ label: string; value: TimelineFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Reminders', value: 'reminder' },
];

export function CalendarScreen() {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedFilter, setSelectedFilter] = useState<TimelineFilter>('all');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      return listVehiclesByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const maintenanceQuery = useQuery({
    queryKey: ['maintenance', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      return listMaintenanceByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      return listRemindersByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const vehicleMap = useMemo(
    () => new Map((vehiclesQuery.data ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [vehiclesQuery.data],
  );

  const vehicleMileageMap = useMemo(
    () => new Map((vehiclesQuery.data ?? []).map((vehicle) => [vehicle.id, vehicle.currentMileage ?? 0])),
    [vehiclesQuery.data],
  );

  const combinedItems = useMemo(
    () => mergeCalendarItems(maintenanceQuery.data ?? [], remindersQuery.data ?? []),
    [maintenanceQuery.data, remindersQuery.data],
  );

  const dayGroups = useMemo(() => {
    const grouped = new Map<string, DayGroup>();

    combinedItems.forEach((item) => {
      const itemDate = getCalendarItemDate(item);

      if (!itemDate || !isSameMonth(itemDate, selectedMonth)) {
        return;
      }

      const dateKey = toDateKey(itemDate);
      const existing = grouped.get(dateKey);

      if (existing) {
        existing.items.push(item);
        return;
      }

      grouped.set(dateKey, {
        dateKey,
        date: itemDate,
        items: [item],
      });
    });

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        items: group.items.sort(compareCalendarItems),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [combinedItems, selectedMonth]);

  const dateOptions = useMemo(
    () => dayGroups.map((group) => ({ key: group.dateKey, label: formatChipDate(group.date) })),
    [dayGroups],
  );

  useEffect(() => {
    if (dateOptions.length === 0) {
      setSelectedDateKey(null);
      return;
    }

    const todayKey = toDateKey(new Date());
    const selectedStillExists = selectedDateKey
      ? dateOptions.some((option) => option.key === selectedDateKey)
      : false;

    if (selectedStillExists) {
      return;
    }

    const todayOption = dateOptions.find((option) => option.key === todayKey);
    setSelectedDateKey(todayOption?.key ?? dateOptions[0].key);
  }, [dateOptions, selectedDateKey]);

  const selectedDay = useMemo(
    () => dayGroups.find((group) => group.dateKey === selectedDateKey) ?? null,
    [dayGroups, selectedDateKey],
  );

  const filteredSelectedItems = useMemo(() => {
    const items = selectedDay?.items ?? [];

    if (selectedFilter === 'all') {
      return items;
    }

    return items.filter((item) => item.kind === selectedFilter);
  }, [selectedDay, selectedFilter]);

  const mileageOnlyReminders = useMemo(() => {
    return (remindersQuery.data ?? [])
      .filter((reminder) => !reminder.dueDate)
      .filter((reminder) => !reminder.isCompleted)
      .filter((reminder) => {
        if (selectedFilter === 'all') {
          return true;
        }

        return selectedFilter === 'reminder';
      })
      .sort((a, b) => (a.dueMileage ?? Number.MAX_SAFE_INTEGER) - (b.dueMileage ?? Number.MAX_SAFE_INTEGER));
  }, [remindersQuery.data, selectedFilter]);

  const monthMaintenanceCount = dayGroups.reduce(
    (count, group) => count + group.items.filter((item) => item.kind === 'maintenance').length,
    0,
  );
  const monthReminderCount = dayGroups.reduce(
    (count, group) => count + group.items.filter((item) => item.kind === 'reminder').length,
    0,
  );
  const overdueCount = (remindersQuery.data ?? []).filter((reminder) =>
    isReminderOverdue(reminder, vehicleMileageMap.get(reminder.vehicleId)),
  ).length;

  const completeMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      return completeReminder(reminderId, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ reminderId, days }: { reminderId: string; days: number }) => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      return snoozeReminder(reminderId, userId, days);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return deleteReminder(reminderId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reminders', userId] });
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

  const isLoading = vehiclesQuery.isLoading || maintenanceQuery.isLoading || remindersQuery.isLoading;
  const isError = vehiclesQuery.isError || maintenanceQuery.isError || remindersQuery.isError;

  return (
    <ScreenContainer
      title="Calendar"
      subtitle="Track maintenance history and reminders by month and day."
    >
      {isLoading ? (
        <Text style={{ color: colors.text }}>Loading calendar...</Text>
      ) : isError ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>Unable to load calendar data.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={[styles.monthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.monthHeader}>
              <Pressable
                style={[styles.monthButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setSelectedMonth((current) => addMonths(current, -1))}
              >
                <Text style={[styles.monthButtonText, { color: colors.text }]}>‹</Text>
              </Pressable>

              <View style={styles.monthTitleWrap}>
                <Text style={[styles.monthTitle, { color: colors.text }]}>
                  {formatMonthYear(selectedMonth)}
                </Text>
                <Text style={[styles.monthSubtitle, { color: colors.textMuted }]}>Month overview</Text>
              </View>

              <Pressable
                style={[styles.monthButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setSelectedMonth((current) => addMonths(current, 1))}
              >
                <Text style={[styles.monthButtonText, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <SummaryStat
                label="Maintenance"
                value={monthMaintenanceCount}
                color={colors.primary}
                mutedColor={colors.textMuted}
              />
              <SummaryStat
                label="Reminders"
                value={monthReminderCount}
                color={colors.text}
                mutedColor={colors.textMuted}
              />
              <SummaryStat
                label="Overdue"
                value={overdueCount}
                color={colors.danger}
                mutedColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => {
              const isSelected = selectedFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? colors.textInverse : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {dateOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateChipsRow}
            >
              {dateOptions.map((option) => {
                const isSelected = selectedDateKey === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.dateChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDateKey(option.key)}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        { color: isSelected ? colors.textInverse : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {selectedDay ? (
            <View style={styles.timelineSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {formatFullDate(selectedDay.date)}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}> 
                {filteredSelectedItems.length} {filteredSelectedItems.length === 1 ? 'item' : 'items'} in timeline
              </Text>

              {filteredSelectedItems.length > 0 ? (
                filteredSelectedItems.map((item, index) => {
                  const reminderId =
                    item.kind === 'reminder' && item.value.id ? item.value.id : undefined;
                  const hasDueDate =
                    item.kind === 'reminder' && item.value.dueDate ? item.value.dueDate : undefined;

                  return (
                    <TimelineCard
                      key={`${item.kind}-${getTimelineItemKey(item)}-${index}`}
                      item={item}
                      vehicleName={getVehicleName(vehicleMap, item)}
                      currentMileage={getCurrentMileage(vehicleMileageMap, item)}
                      colors={colors}
                      onComplete={
                        reminderId ? () => completeMutation.mutate(reminderId) : undefined
                      }
                      onSnooze={
                        reminderId && hasDueDate
                          ? () => handleSnooze(reminderId)
                          : undefined
                      }
                      onDelete={
                        reminderId 
                          ? () => handleDelete(reminderId, formatMaintenanceType(item.value.type))
                          : undefined
                      }
                    />
                  );
                })
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted }]}> 
                  <Text style={[styles.emptyText, { color: colors.text }]}>No items for this filter.</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Try another filter or date chip.</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.surfaceMuted }]}> 
              <Text style={[styles.emptyText, { color: colors.text }]}>No dated items this month.</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Maintenance and date-based reminders will appear here.</Text>
            </View>
          )}

          {mileageOnlyReminders.length > 0 ? (
            <View style={styles.timelineSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Mileage-based reminders</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>These reminders do not have a due date yet.</Text>

              {mileageOnlyReminders.map((reminder) => {
                const reminderId = reminder.id ? reminder.id : undefined;
                return (
                  <TimelineCard
                    key={`mileage-${reminder.id}`}
                    item={{ kind: 'reminder', value: reminder }}
                    vehicleName={getVehicleName(vehicleMap, { kind: 'reminder', value: reminder })}
                    currentMileage={vehicleMileageMap.get(reminder.vehicleId)}
                    colors={colors}
                    onComplete={reminderId ? () => completeMutation.mutate(reminderId) : undefined}
                    onDelete={
                      reminderId
                        ? () => handleDelete(reminderId, formatMaintenanceType(reminder.type))
                        : undefined
                    }
                  />
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function SummaryStat({
  label,
  value,
  color,
  mutedColor,
}: {
  label: string;
  value: number;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function TimelineCard({
  item,
  vehicleName,
  currentMileage,
  colors,
  onComplete,
  onSnooze,
  onDelete,
}: {
  item: CalendarItem;
  vehicleName: string;
  currentMileage?: number;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onComplete?: () => void;
  onSnooze?: () => void;
  onDelete?: () => void;
}) {
  if (item.kind === 'maintenance') {
    return (
      <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <View style={styles.timelineHeader}>
          <View style={styles.timelineTitleWrap}>
            <Text style={[styles.timelineBadge, { color: colors.primary }]}>Maintenance</Text>
            <Text style={[styles.timelineTitle, { color: colors.text }]}>
              {formatMaintenanceType(item.value.type)}
            </Text>
            <Text style={[styles.timelineMeta, { color: colors.textMuted }]}>{vehicleName}</Text>
          </View>
          {typeof item.value.cost === 'number' ? (
            <Text style={[styles.timelineValue, { color: colors.primary }]}>
              ${item.value.cost.toFixed(2)}
            </Text>
          ) : null}
        </View>

        <View style={styles.timelineDetails}>
          {typeof item.value.mileage === 'number' ? (
            <Text style={[styles.timelineDetailText, { color: colors.textMuted }]}>
              📍 {item.value.mileage.toLocaleString()} mi
            </Text>
          ) : null}
          {item.value.notes ? (
            <Text style={[styles.timelineNote, { color: colors.text }]}>{item.value.notes}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  const overdue = isReminderOverdue(item.value, currentMileage);

  return (
    <View
      style={[
        styles.timelineCard,
        {
          backgroundColor: colors.surface,
          borderColor: overdue ? colors.danger : colors.border,
          borderWidth: overdue ? 2 : 1,
        },
      ]}
    >
      <View style={styles.timelineHeader}>
        <View style={styles.timelineTitleWrap}>
          <Text style={[styles.timelineBadge, { color: overdue ? colors.danger : colors.primary }]}>Reminder</Text>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>
            {formatMaintenanceType(item.value.type)}
          </Text>
          <Text style={[styles.timelineMeta, { color: colors.textMuted }]}>{vehicleName}</Text>
        </View>
        <Text style={[styles.timelineValue, { color: overdue ? colors.danger : colors.textMuted }]}>
          {item.value.isCompleted ? 'Done' : overdue ? 'Overdue' : 'Open'}
        </Text>
      </View>

      <View style={styles.timelineDetails}>
        {item.value.dueDate ? (
          <Text style={[styles.timelineDetailText, { color: overdue ? colors.danger : colors.textMuted }]}>
            📅 {formatShortDate(item.value.dueDate)}
          </Text>
        ) : null}
        {typeof item.value.dueMileage === 'number' ? (
          <Text style={[styles.timelineDetailText, { color: overdue ? colors.danger : colors.textMuted }]}>
            📍 Due at {item.value.dueMileage.toLocaleString()} mi
            {typeof currentMileage === 'number'
              ? ` (current ${currentMileage.toLocaleString()})`
              : ''}
          </Text>
        ) : null}
        <Text style={[styles.timelineNote, { color: colors.text }]}>{item.value.message}</Text>
      </View>

      {!item.value.isCompleted && (onComplete || onSnooze || onDelete) ? (
        <View style={styles.timelineActions}>
          {onComplete ? (
            <View style={styles.actionButtonWrap}>
              <Button title="Done" onPress={onComplete} variant="primary" />
            </View>
          ) : null}
          {onSnooze ? (
            <View style={styles.actionButtonWrap}>
              <Button title="Snooze" onPress={onSnooze} variant="secondary" />
            </View>
          ) : null}
          {onDelete ? (
            <View style={styles.actionButtonWrap}>
              <Button title="Remove" onPress={onDelete} variant="secondary" />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function getCalendarItemDate(item: CalendarItem): Date | undefined {
  if (item.kind === 'maintenance') {
    return item.value.date;
  }

  return item.value.dueDate;
}

function compareCalendarItems(a: CalendarItem, b: CalendarItem): number {
  const aDate = getCalendarItemDate(a)?.getTime() ?? 0;
  const bDate = getCalendarItemDate(b)?.getTime() ?? 0;

  if (aDate !== bDate) {
    return bDate - aDate;
  }

  if (a.kind === b.kind) {
    return 0;
  }

  return a.kind === 'reminder' ? -1 : 1;
}

function getTimelineItemKey(item: CalendarItem): string {
  return item.value.id ?? `${item.kind}-${getCalendarItemDate(item)?.toISOString() ?? 'unknown'}`;
}

function getVehicleName(
  vehicleMap: Map<string | undefined, { make?: string; model?: string; year?: number; name: string }>,
  item: CalendarItem,
): string {
  const vehicle = vehicleMap.get(item.value.vehicleId);

  if (!vehicle) {
    return 'Unknown vehicle';
  }

  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const yearPrefix = vehicle.year ? `${vehicle.year} ` : '';
  return `${yearPrefix}${makeModel || vehicle.name}`.trim();
}

function getCurrentMileage(vehicleMileageMap: Map<string | undefined, number>, item: CalendarItem) {
  return vehicleMileageMap.get(item.value.vehicleId);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function toDateKey(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatChipDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  monthCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 22,
    fontWeight: '700',
  },
  monthTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthSubtitle: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateChipsRow: {
    gap: 8,
    paddingRight: 4,
  },
  dateChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: -6,
  },
  timelineCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineTitleWrap: {
    flex: 1,
    gap: 4,
  },
  timelineBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  timelineMeta: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineDetails: {
    gap: 6,
  },
  timelineDetailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timelineNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonWrap: {
    flex: 1,
  },
  emptyState: {
    borderRadius: 14,
    padding: 18,
    gap: 6,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
  },
});
