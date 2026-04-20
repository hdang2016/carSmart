import type { MaintenanceType } from './maintenance';

export interface Vehicle {
  id?: string;
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
  mileageUpdatedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id?: string;
  userId: string;
  vehicleId: string;
  type: MaintenanceType;
  date: Date;
  mileage?: number;
  notes?: string;
  cost?: number;
  createdAt: Date;
}

export interface Reminder {
  id?: string;
  userId: string;
  vehicleId: string;
  type: MaintenanceType;
  dueDate?: Date;
  dueMileage?: number;
  isCompleted: boolean;
  notificationSent: boolean;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceInterval {
  id?: string;
  userId: string;
  type: MaintenanceType;
  mileageInterval?: number; // e.g., 5000 miles
  monthsInterval?: number; // e.g., 6 months
  createdAt: Date;
  updatedAt: Date;
}
