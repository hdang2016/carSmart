import { z } from 'zod';

import { MAINTENANCE_TYPES } from '../types/maintenance';

const nonEmptyString = z.string().trim().min(1);
const dateSchema = z.coerce.date();
const positiveNumber = z.coerce.number().positive();
const nonNegativeNumber = z.coerce.number().min(0);

export const vehicleSchema = z.object({
  userId: nonEmptyString,
  name: nonEmptyString,
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  vin: z.string().trim().optional(),
  plate: z.string().trim().optional(),
  oilType: z.string().trim().optional(),
  tireSize: z.string().trim().optional(),
  currentMileage: nonNegativeNumber.optional(),
  isActive: z.boolean().default(true),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const maintenanceSchema = z.object({
  userId: nonEmptyString,
  vehicleId: nonEmptyString,
  type: z.enum(MAINTENANCE_TYPES),
  date: dateSchema,
  mileage: nonNegativeNumber.optional(),
  notes: z.string().trim().optional(),
  cost: positiveNumber.optional(),
  createdAt: dateSchema,
});

export const reminderSchema = z.object({
  userId: nonEmptyString,
  vehicleId: nonEmptyString,
  type: z.enum(MAINTENANCE_TYPES),
  dueDate: dateSchema.optional(),
  dueMileage: nonNegativeNumber.optional(),
  isCompleted: z.boolean().default(false),
  notificationSent: z.boolean().default(false),
  message: nonEmptyString,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).refine((value) => Boolean(value.dueDate || value.dueMileage), {
  message: 'At least one of dueDate or dueMileage is required',
  path: ['dueDate'],
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
