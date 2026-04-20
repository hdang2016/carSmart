import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from '../config/firebase';
import { reminderSchema } from '../schemas';
import type { Reminder } from '../types/models';

export function validateReminderInput(input: unknown) {
  return reminderSchema.parse(input);
}

type ReminderCreateInput = {
  userId: string;
  vehicleId: string;
  type: Reminder['type'];
  dueDate?: Date;
  dueMileage?: number;
  message: string;
};

type ReminderUpdateInput = {
  type?: Reminder['type'];
  dueDate?: Date;
  dueMileage?: number;
  message?: string;
  isCompleted?: boolean;
  notificationSent?: boolean;
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value as string);
}

function removeUndefinedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter((entry) => entry[1] !== undefined),
  ) as Partial<T>;
}

function mapReminderDoc(id: string, data: Record<string, unknown>): Reminder {
  return {
    id,
    userId: String(data.userId ?? ''),
    vehicleId: String(data.vehicleId ?? ''),
    type: data.type as Reminder['type'],
    dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
    dueMileage: typeof data.dueMileage === 'number' ? data.dueMileage : undefined,
    isCompleted: Boolean(data.isCompleted),
    notificationSent: Boolean(data.notificationSent),
    message: String(data.message ?? ''),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listRemindersByVehicle(vehicleId: string): Promise<Reminder[]> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const remindersQuery = query(
    collection(firestore, 'reminders'),
    where('vehicleId', '==', vehicleId),
  );

  const snapshot = await getDocs(remindersQuery);

  return snapshot.docs
    .map((docSnapshot) => mapReminderDoc(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => {
      // Sort by completion status first (incomplete first), then by due date
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });
}

export async function listRemindersByUser(userId: string): Promise<Reminder[]> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const remindersQuery = query(
    collection(firestore, 'reminders'),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(remindersQuery);

  return snapshot.docs
    .map((docSnapshot) => mapReminderDoc(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    });
}

export async function listActiveRemindersByUser(userId: string): Promise<Reminder[]> {
  const allReminders = await listRemindersByUser(userId);
  return allReminders.filter((reminder) => !reminder.isCompleted);
}

export async function getReminderById(reminderId: string): Promise<Reminder> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const reminderRef = doc(firestore, 'reminders', reminderId);
  const snapshot = await getDoc(reminderRef);

  if (!snapshot.exists()) {
    throw new Error('Reminder not found');
  }

  return mapReminderDoc(snapshot.id, snapshot.data());
}

export async function createReminder(input: ReminderCreateInput): Promise<Reminder> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const now = new Date();

  const parsed = validateReminderInput({
    ...input,
    isCompleted: false,
    notificationSent: false,
    createdAt: now,
    updatedAt: now,
  });

  const docData = {
    ...removeUndefinedFields({
      userId: parsed.userId,
      vehicleId: parsed.vehicleId,
      type: parsed.type,
      dueDate: parsed.dueDate ? Timestamp.fromDate(parsed.dueDate) : undefined,
      dueMileage: parsed.dueMileage,
      message: parsed.message,
    }),
    isCompleted: parsed.isCompleted,
    notificationSent: parsed.notificationSent,
    createdAt: Timestamp.fromDate(parsed.createdAt),
    updatedAt: Timestamp.fromDate(parsed.updatedAt),
  };

  const docRef = await addDoc(collection(firestore, 'reminders'), docData);

  return getReminderById(docRef.id);
}

export async function updateReminder(
  reminderId: string,
  userId: string,
  input: ReminderUpdateInput,
): Promise<Reminder> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const reminderRef = doc(firestore, 'reminders', reminderId);
  const snapshot = await getDoc(reminderRef);

  if (!snapshot.exists()) {
    throw new Error('Reminder not found');
  }

  const data = snapshot.data();

  if (data.userId !== userId) {
    throw new Error('Unauthorized: You can only update your own reminders');
  }

  const now = new Date();

  const updateData = {
    ...removeUndefinedFields({
      type: input.type,
      dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : undefined,
      dueMileage: input.dueMileage,
      message: input.message,
      isCompleted: input.isCompleted,
      notificationSent: input.notificationSent,
    }),
    updatedAt: Timestamp.fromDate(now),
  };

  await updateDoc(reminderRef, updateData);

  return getReminderById(reminderId);
}

export async function completeReminder(reminderId: string, userId: string): Promise<Reminder> {
  return updateReminder(reminderId, userId, {
    isCompleted: true,
  });
}

export async function snoozeReminder(
  reminderId: string,
  userId: string,
  days: number = 1,
): Promise<Reminder> {
  const reminder = await getReminderById(reminderId);

  if (!reminder.dueDate) {
    throw new Error('Cannot snooze a reminder without a due date');
  }

  const newDueDate = new Date(reminder.dueDate);
  newDueDate.setDate(newDueDate.getDate() + days);

  return updateReminder(reminderId, userId, {
    dueDate: newDueDate,
    notificationSent: false,
  });
}

export async function deleteReminder(reminderId: string): Promise<void> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const reminderRef = doc(firestore, 'reminders', reminderId);
  await deleteDoc(reminderRef);
}

// Helper functions for reminder status

export function isReminderOverdue(reminder: Reminder, currentMileage?: number): boolean {
  if (reminder.isCompleted) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  // Check date-based overdue
  if (reminder.dueDate) {
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < now) {
      return true;
    }
  }

  // Check mileage-based overdue
  if (reminder.dueMileage && currentMileage !== undefined) {
    if (currentMileage >= reminder.dueMileage) {
      return true;
    }
  }

  return false;
}

export function isReminderDueSoon(
  reminder: Reminder,
  currentMileage?: number,
  daysThreshold: number = 7,
  mileageThreshold: number = 500,
): boolean {
  if (reminder.isCompleted) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Check date-based due soon
  if (reminder.dueDate) {
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue >= 0 && daysUntilDue <= daysThreshold) {
      return true;
    }
  }

  // Check mileage-based due soon
  if (reminder.dueMileage && currentMileage !== undefined) {
    const milesUntilDue = reminder.dueMileage - currentMileage;
    if (milesUntilDue >= 0 && milesUntilDue <= mileageThreshold) {
      return true;
    }
  }

  return false;
}

export async function getOverdueReminders(
  userId: string,
  vehicleMileageMap?: Map<string, number>,
): Promise<Reminder[]> {
  const reminders = await listActiveRemindersByUser(userId);
  return reminders.filter((reminder) => {
    const currentMileage = vehicleMileageMap?.get(reminder.vehicleId);
    return isReminderOverdue(reminder, currentMileage);
  });
}

export async function getDueSoonReminders(
  userId: string,
  vehicleMileageMap?: Map<string, number>,
  daysThreshold: number = 7,
  mileageThreshold: number = 500,
): Promise<Reminder[]> {
  const reminders = await listActiveRemindersByUser(userId);
  return reminders.filter((reminder) => {
    const currentMileage = vehicleMileageMap?.get(reminder.vehicleId);
    return isReminderDueSoon(reminder, currentMileage, daysThreshold, mileageThreshold);
  });
}

