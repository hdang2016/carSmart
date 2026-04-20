import type { MaintenanceRecord, Reminder } from '../types/models';

export type CalendarItem =
  | { kind: 'maintenance'; value: MaintenanceRecord }
  | { kind: 'reminder'; value: Reminder };

export function mergeCalendarItems(
  maintenance: MaintenanceRecord[],
  reminders: Reminder[],
): CalendarItem[] {
  const maintenanceItems: CalendarItem[] = maintenance.map((value) => ({
    kind: 'maintenance',
    value,
  }));

  const reminderItems: CalendarItem[] = reminders.map((value) => ({
    kind: 'reminder',
    value,
  }));

  return [...maintenanceItems, ...reminderItems];
}
