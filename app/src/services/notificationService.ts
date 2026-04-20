import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '../types/models';
import { formatMaintenanceType } from '../utils/maintenance';

const REMINDER_NOTIFICATION_CHANNEL_ID = 'reminders';

let isConfigured = false;

function isDeviceNotificationSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function getTriggerDateForReminder(dueDate: Date): Date | null {
  const trigger = new Date(dueDate);
  trigger.setHours(9, 0, 0, 0);

  const now = new Date();
  if (trigger.getTime() <= now.getTime()) {
    return null;
  }

  return trigger;
}

function buildNotificationData(reminder: Reminder) {
  return {
    source: 'carsmart-reminder',
    reminderId: reminder.id,
    vehicleId: reminder.vehicleId,
    type: reminder.type,
  };
}

function buildReminderTitle(type: Reminder['type']): string {
  return `${formatMaintenanceType(type)} Reminder`;
}

async function ensureNotificationSetup(): Promise<boolean> {
  if (!isDeviceNotificationSupported()) {
    return false;
  }

  if (!isConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_NOTIFICATION_CHANNEL_ID, {
        name: 'Reminder Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    isConfigured = true;
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function initializeReminderNotifications(): Promise<void> {
  try {
    await ensureNotificationSetup();
  } catch (error) {
    console.warn('Unable to initialize notifications', error);
  }
}

export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  if (!isDeviceNotificationSupported()) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const related = scheduled.filter(
    (item) => (item.content.data?.reminderId as string | undefined) === reminderId,
  );

  await Promise.all(
    related.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleReminderNotification(reminder: Reminder): Promise<void> {
  if (!reminder.id || !reminder.dueDate || reminder.isCompleted) {
    return;
  }

  const hasPermission = await ensureNotificationSetup();
  if (!hasPermission) {
    return;
  }

  const triggerDate = getTriggerDateForReminder(reminder.dueDate);
  if (!triggerDate) {
    return;
  }

  await cancelReminderNotifications(reminder.id);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: buildReminderTitle(reminder.type),
      body: reminder.message,
      data: buildNotificationData(reminder),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? REMINDER_NOTIFICATION_CHANNEL_ID : undefined,
    },
  });
}

export async function syncReminderNotification(reminder: Reminder): Promise<void> {
  if (!reminder.id) {
    return;
  }

  await cancelReminderNotifications(reminder.id);

  if (reminder.dueDate && !reminder.isCompleted) {
    await scheduleReminderNotification(reminder);
  }
}

export async function resyncReminderNotifications(reminders: Reminder[]): Promise<void> {
  if (!isDeviceNotificationSupported()) {
    return;
  }

  const hasPermission = await ensureNotificationSetup();
  if (!hasPermission) {
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminderEntries = scheduled.filter((item) => {
    const source = item.content.data?.source as string | undefined;
    return source === 'carsmart-reminder';
  });

  await Promise.all(
    reminderEntries.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  for (const reminder of reminders) {
    if (!reminder.id || !reminder.dueDate || reminder.isCompleted) {
      continue;
    }

    const triggerDate = getTriggerDateForReminder(reminder.dueDate);
    if (!triggerDate) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: buildReminderTitle(reminder.type),
        body: reminder.message,
        data: buildNotificationData(reminder),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? REMINDER_NOTIFICATION_CHANNEL_ID : undefined,
      },
    });
  }
}
