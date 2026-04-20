import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from '../config/firebase';
import { maintenanceSchema } from '../schemas';
import type { MaintenanceRecord } from '../types/models';
import { getIntervalByType, getMaintenanceTypeName } from './intervalService';
import { createReminder } from './reminderService';

export function validateMaintenanceInput(input: unknown) {
  return maintenanceSchema.parse(input);
}

type MaintenanceCreateInput = {
  userId: string;
  vehicleId: string;
  type: MaintenanceRecord['type'];
  date: Date;
  mileage?: number;
  notes?: string;
  cost?: number;
};

type MaintenanceUpdateInput = {
  vehicleId: string;
  type: MaintenanceRecord['type'];
  date: Date;
  mileage?: number;
  notes?: string;
  cost?: number;
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

function mapMaintenanceDoc(id: string, data: Record<string, unknown>): MaintenanceRecord {
  return {
    id,
    userId: String(data.userId ?? ''),
    vehicleId: String(data.vehicleId ?? ''),
    type: data.type as MaintenanceRecord['type'],
    date: toDate(data.date),
    mileage: typeof data.mileage === 'number' ? data.mileage : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    cost: typeof data.cost === 'number' ? data.cost : undefined,
    createdAt: toDate(data.createdAt),
  };
}

export async function listMaintenanceByVehicle(
  vehicleId: string,
  userId: string,
): Promise<MaintenanceRecord[]> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const recordsQuery = query(
    collection(firestore, 'maintenance'),
    where('vehicleId', '==', vehicleId),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(recordsQuery);

  return snapshot.docs
    .map((docSnapshot) => mapMaintenanceDoc(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function listMaintenanceByUser(userId: string): Promise<MaintenanceRecord[]> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const recordsQuery = query(
    collection(firestore, 'maintenance'),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(recordsQuery);

  return snapshot.docs
    .map((docSnapshot) => mapMaintenanceDoc(docSnapshot.id, docSnapshot.data()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function createMaintenanceRecord(
  input: MaintenanceCreateInput,
): Promise<MaintenanceRecord> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const now = new Date();

  const parsed = validateMaintenanceInput({
    ...input,
    createdAt: now,
  });

  const docRef = await addDoc(collection(firestore, 'maintenance'), {
    ...removeUndefinedFields(parsed),
    date: Timestamp.fromDate(parsed.date),
    createdAt: Timestamp.fromDate(parsed.createdAt),
  });

  if (typeof parsed.mileage === 'number') {
    const maintenanceMileage = parsed.mileage;
    const vehicleRef = doc(firestore, 'vehicles', parsed.vehicleId);

    await runTransaction(firestore, async (transaction) => {
      const vehicleSnapshot = await transaction.get(vehicleRef);

      if (!vehicleSnapshot.exists()) {
        return;
      }

      const vehicleData = vehicleSnapshot.data();

      if (vehicleData.userId !== parsed.userId) {
        return;
      }

      const currentMileage =
        typeof vehicleData.currentMileage === 'number' ? vehicleData.currentMileage : undefined;

      if (currentMileage === undefined || maintenanceMileage > currentMileage) {
        transaction.update(vehicleRef, {
          currentMileage: maintenanceMileage,
          updatedAt: Timestamp.fromDate(new Date()),
        });
      }
    });
  }

  const maintenanceRecord: MaintenanceRecord = {
    id: docRef.id,
    ...parsed,
  };

  // Create auto-reminder for next service (async, don't block)
  createAutoReminder(maintenanceRecord).catch((error) => {
    console.error('Failed to create auto-reminder:', error);
  });

  return maintenanceRecord;
}

export async function getMaintenanceById(
  maintenanceId: string,
): Promise<MaintenanceRecord | null> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const recordRef = doc(firestore, 'maintenance', maintenanceId);
  const snapshot = await getDoc(recordRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapMaintenanceDoc(snapshot.id, snapshot.data());
}

export async function updateMaintenanceRecord(
  maintenanceId: string,
  userId: string,
  input: MaintenanceUpdateInput,
): Promise<void> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const recordRef = doc(firestore, 'maintenance', maintenanceId);

  const safeInput = removeUndefinedFields({
    ...input,
    date: Timestamp.fromDate(input.date),
  });

  await updateDoc(recordRef, safeInput);

  if (typeof input.mileage === 'number') {
    const maintenanceMileage = input.mileage;
    const vehicleRef = doc(firestore, 'vehicles', input.vehicleId);

    await runTransaction(firestore, async (transaction) => {
      const vehicleSnapshot = await transaction.get(vehicleRef);

      if (!vehicleSnapshot.exists()) {
        return;
      }

      const vehicleData = vehicleSnapshot.data();

      if (vehicleData.userId !== userId) {
        return;
      }

      const currentMileage =
        typeof vehicleData.currentMileage === 'number' ? vehicleData.currentMileage : undefined;

      if (currentMileage === undefined || maintenanceMileage > currentMileage) {
        transaction.update(vehicleRef, {
          currentMileage: maintenanceMileage,
          updatedAt: Timestamp.fromDate(new Date()),
        });
      }
    });
  }
}

/**
 * Helper function to create auto-reminder based on service intervals
 * This is called after logging maintenance to automatically schedule the next service
 */
async function createAutoReminder(maintenance: MaintenanceRecord): Promise<void> {
  try {
    // Get the configured service interval for this maintenance type
    const interval = await getIntervalByType(maintenance.userId, maintenance.type);

    // Skip if both intervals are zero or undefined
    if ((!interval.mileageInterval || interval.mileageInterval === 0) &&
        (!interval.monthsInterval || interval.monthsInterval === 0)) {
      return;
    }

    // Calculate next due date (if months interval is set)
    let dueDate: Date | undefined;
    if (interval.monthsInterval && interval.monthsInterval > 0) {
      const nextDate = new Date(maintenance.date);
      nextDate.setMonth(nextDate.getMonth() + interval.monthsInterval);
      dueDate = nextDate;
    }

    // Calculate next due mileage (if mileage interval is set and maintenance had mileage)
    let dueMileage: number | undefined;
    if (interval.mileageInterval && interval.mileageInterval > 0 && maintenance.mileage) {
      dueMileage = maintenance.mileage + interval.mileageInterval;
    }

    // Create message
    const serviceName = getMaintenanceTypeName(maintenance.type);
    const parts: string[] = [];
    
    if (dueMileage) {
      parts.push(`${dueMileage.toLocaleString('en-US')} miles`);
    }
    
    if (dueDate) {
      const monthsDue = interval.monthsInterval ?? 0;
      parts.push(`${monthsDue} ${monthsDue === 1 ? 'month' : 'months'}`);
    }

    const message = parts.length > 0
      ? `${serviceName} due in ${parts.join(' or ')}`
      : `${serviceName} due`;

    // Create the reminder (only if we have at least one due criterion)
    if (dueDate || dueMileage) {
      await createReminder({
        userId: maintenance.userId,
        vehicleId: maintenance.vehicleId,
        type: maintenance.type,
        dueDate,
        dueMileage,
        message,
      });
    }
  } catch (error) {
    // Log error but don't fail the maintenance creation
    console.error('Failed to create auto-reminder:', error);
  }
}

export async function deleteMaintenanceRecord(maintenanceId: string): Promise<void> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const recordRef = doc(firestore, 'maintenance', maintenanceId);
  await deleteDoc(recordRef);
}
