import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from '../config/firebase';
import { vehicleSchema } from '../schemas';
import type { Vehicle } from '../types/models';

export function validateVehicleInput(input: unknown) {
  return vehicleSchema.parse(input);
}

type VehicleCreateInput = {
  userId: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  oilType?: string;
  tireSize?: string;
  currentMileage?: number;
};

type VehicleUpdateInput = {
  name: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  oilType?: string;
  tireSize?: string;
  currentMileage?: number;
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

function mapVehicleDoc(id: string, data: Record<string, unknown>): Vehicle {
  return {
    id,
    userId: String(data.userId ?? ''),
    name: String(data.name ?? ''),
    make: typeof data.make === 'string' ? data.make : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
    year: typeof data.year === 'number' ? data.year : undefined,
    vin: typeof data.vin === 'string' ? data.vin : undefined,
    plate: typeof data.plate === 'string' ? data.plate : undefined,
    oilType: typeof data.oilType === 'string' ? data.oilType : undefined,
    tireSize: typeof data.tireSize === 'string' ? data.tireSize : undefined,
    currentMileage:
      typeof data.currentMileage === 'number' ? data.currentMileage : undefined,
    mileageUpdatedAt: data.mileageUpdatedAt ? toDate(data.mileageUpdatedAt) : undefined,
    isActive: data.isActive !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function removeUndefinedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter((entry) => entry[1] !== undefined),
  ) as Partial<T>;
}

export async function listVehiclesByUser(userId: string): Promise<Vehicle[]> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const vehiclesQuery = query(
    collection(firestore, 'vehicles'),
    where('userId', '==', userId),
  );

  const snapshot = await getDocs(vehiclesQuery);

  return snapshot.docs
    .map((doc) => mapVehicleDoc(doc.id, doc.data()))
    .filter((vehicle) => vehicle.isActive)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function createVehicle(input: VehicleCreateInput): Promise<Vehicle> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const now = new Date();

  const parsed = validateVehicleInput({
    ...input,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const docData: Record<string, unknown> = {
    ...removeUndefinedFields(parsed),
    createdAt: Timestamp.fromDate(parsed.createdAt),
    updatedAt: Timestamp.fromDate(parsed.updatedAt),
  };

  // If mileage is provided, set the mileageUpdatedAt timestamp
  if (input.currentMileage !== undefined) {
    docData.mileageUpdatedAt = Timestamp.fromDate(now);
  }

  const docRef = await addDoc(collection(firestore, 'vehicles'), docData);

  return {
    id: docRef.id,
    ...parsed,
    mileageUpdatedAt: input.currentMileage !== undefined ? now : undefined,
  };
}

export async function updateVehicle(
  vehicleId: string,
  input: VehicleUpdateInput,
): Promise<void> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const vehicleDoc = doc(firestore, 'vehicles', vehicleId);

  const safeInput = removeUndefinedFields(input);
  const now = new Date();

  const updateData: Record<string, unknown> = {
    ...safeInput,
    updatedAt: Timestamp.fromDate(now),
  };

  // If mileage is being updated, set the mileageUpdatedAt timestamp
  if (input.currentMileage !== undefined) {
    updateData.mileageUpdatedAt = Timestamp.fromDate(now);
  }

  await updateDoc(vehicleDoc, updateData);
}

export async function getVehicleById(vehicleId: string): Promise<Vehicle | null> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const vehicleDoc = doc(firestore, 'vehicles', vehicleId);
  const snapshot = await getDoc(vehicleDoc);

  if (!snapshot.exists()) {
    return null;
  }

  return mapVehicleDoc(snapshot.id, snapshot.data());
}

export async function archiveVehicle(vehicleId: string): Promise<void> {
  if (!firestore) {
    throw new Error('Firestore is not configured. Add Firebase env values first.');
  }

  const vehicleDoc = doc(firestore, 'vehicles', vehicleId);

  await updateDoc(vehicleDoc, {
    isActive: false,
    updatedAt: Timestamp.fromDate(new Date()),
  });
}
