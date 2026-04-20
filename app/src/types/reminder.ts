import { MAINTENANCE_TYPES } from './maintenance';

export const REMINDER_TYPES = ['registration_renewal', ...MAINTENANCE_TYPES] as const;

export type ReminderType = (typeof REMINDER_TYPES)[number];

export function isDateOnlyReminderType(type: ReminderType): boolean {
  return type === 'registration_renewal';
}
