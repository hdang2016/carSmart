import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import type { MaintenanceInterval } from '../types/models';
import type { MaintenanceType } from '../types/maintenance';

const INTERVALS_COLLECTION = 'maintenanceIntervals';

/**
 * Default intervals for each maintenance type
 * These are used when user hasn't set custom intervals
 */
export const DEFAULT_INTERVALS: Record<MaintenanceType, { mileageInterval: number; monthsInterval: number }> = {
  oil_change: { mileageInterval: 5000, monthsInterval: 6 },
  air_filter_change: { mileageInterval: 15000, monthsInterval: 12 },
  cabin_air_filter_change: { mileageInterval: 15000, monthsInterval: 12 },
  tire_rotation: { mileageInterval: 7500, monthsInterval: 6 },
  wiper_blade: { mileageInterval: 0, monthsInterval: 12 },
  battery: { mileageInterval: 0, monthsInterval: 48 },
  brake: { mileageInterval: 50000, monthsInterval: 36 },
  new_tire: { mileageInterval: 50000, monthsInterval: 60 },
  other: { mileageInterval: 0, monthsInterval: 0 },
};

/**
 * Get formatted display name for maintenance type
 */
export function getMaintenanceTypeName(type: MaintenanceType): string {
  const names: Record<MaintenanceType, string> = {
    oil_change: 'Oil Change',
    air_filter_change: 'Air Filter Change',
    cabin_air_filter_change: 'Cabin Air Filter',
    tire_rotation: 'Tire Rotation',
    wiper_blade: 'Wiper Blade',
    battery: 'Battery',
    brake: 'Brake Service',
    new_tire: 'New Tire',
    other: 'Other Service',
  };
  return names[type];
}

/**
 * Get all maintenance intervals for a user
 * If no custom intervals exist, returns default intervals
 */
export async function getUserIntervals(userId: string): Promise<MaintenanceInterval[]> {
  try {
    const intervalsRef = collection(firestore!, INTERVALS_COLLECTION);
    const q = query(intervalsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const intervals: MaintenanceInterval[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      intervals.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        mileageInterval: data.mileageInterval,
        monthsInterval: data.monthsInterval,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return intervals;
  } catch (error) {
    console.error('Error getting user intervals:', error);
    throw error;
  }
}

/**
 * Get interval for specific maintenance type
 * Returns custom interval if exists, otherwise returns default
 */
export async function getIntervalByType(
  userId: string,
  type: MaintenanceType
): Promise<MaintenanceInterval> {
  try {
    const intervals = await getUserIntervals(userId);
    const customInterval = intervals.find((i) => i.type === type);

    if (customInterval) {
      return customInterval;
    }

    // Return default interval
    const defaults = DEFAULT_INTERVALS[type];
    return {
      userId,
      type,
      mileageInterval: defaults.mileageInterval,
      monthsInterval: defaults.monthsInterval,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error getting interval by type:', error);
    throw error;
  }
}

/**
 * Save or update maintenance interval
 * Creates new document if doesn't exist, updates if it does
 */
export async function saveInterval(
  userId: string,
  type: MaintenanceType,
  mileageInterval?: number,
  monthsInterval?: number
): Promise<void> {
  try {
    // Use type-based ID to ensure only one interval per type per user
    const intervalId = `${userId}_${type}`;
    const intervalRef = doc(firestore!, INTERVALS_COLLECTION, intervalId);

    const now = Timestamp.now();
    const existingDoc = await getDoc(intervalRef);

    const data = {
      userId,
      type,
      mileageInterval: mileageInterval || 0,
      monthsInterval: monthsInterval || 0,
      updatedAt: now,
      ...(existingDoc.exists() ? {} : { createdAt: now }),
    };

    await setDoc(intervalRef, data, { merge: true });
  } catch (error) {
    console.error('Error saving interval:', error);
    throw error;
  }
}

/**
 * Save multiple intervals at once (batch operation)
 */
export async function saveAllIntervals(
  userId: string,
  intervals: Array<{
    type: MaintenanceType;
    mileageInterval?: number;
    monthsInterval?: number;
  }>
): Promise<void> {
  try {
    const promises = intervals.map((interval) =>
      saveInterval(userId, interval.type, interval.mileageInterval, interval.monthsInterval)
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Error saving all intervals:', error);
    throw error;
  }
}

/**
 * Reset intervals to defaults for a user
 */
export async function resetToDefaults(userId: string): Promise<void> {
  try {
    const types: MaintenanceType[] = Object.keys(DEFAULT_INTERVALS) as MaintenanceType[];
    const promises = types.map((type) => {
      const defaults = DEFAULT_INTERVALS[type];
      return saveInterval(userId, type, defaults.mileageInterval, defaults.monthsInterval);
    });
    await Promise.all(promises);
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    throw error;
  }
}
