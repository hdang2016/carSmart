import { listMaintenanceByUser } from './maintenanceService';
import { listActiveRemindersByUser, createReminder } from './reminderService';
import { getIntervalByType, getMaintenanceTypeName } from './intervalService';
import type { MaintenanceType } from '../types/maintenance';
import type { MaintenanceRecord } from '../types/models';

/**
 * Generate reminders for existing maintenance records that don't have reminders yet
 * This creates reminders based on the most recent maintenance for each service type
 */
export async function generateRemindersForExistingMaintenance(userId: string): Promise<number> {
  try {
    // Get all maintenance records for the user
    const maintenanceRecords = await listMaintenanceByUser(userId);
    
    // Get existing reminders to avoid duplicates
    const existingReminders = await listActiveRemindersByUser(userId);
    
    // Group maintenance by vehicle and type, keeping only the most recent
    const latestMaintenanceMap = new Map<string, MaintenanceRecord>();
    
    maintenanceRecords.forEach((record) => {
      const key = `${record.vehicleId}_${record.type}`;
      const existing = latestMaintenanceMap.get(key);
      
      if (!existing || record.date > existing.date) {
        latestMaintenanceMap.set(key, record);
      }
    });
    
    let remindersCreated = 0;
    
    // For each latest maintenance record, check if reminder exists
    for (const [key, maintenance] of latestMaintenanceMap.entries()) {
      // Check if reminder already exists for this vehicle/type combination
      const hasReminder = existingReminders.some(
        (r) => r.vehicleId === maintenance.vehicleId && r.type === maintenance.type
      );
      
      if (hasReminder) {
        continue; // Skip if reminder already exists
      }
      
      // Get the configured interval for this service type
      const interval = await getIntervalByType(userId, maintenance.type);
      
      // Skip if both intervals are zero or undefined
      if (
        (!interval.mileageInterval || interval.mileageInterval === 0) &&
        (!interval.monthsInterval || interval.monthsInterval === 0)
      ) {
        continue;
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
      
      const message =
        parts.length > 0 ? `${serviceName} due in ${parts.join(' or ')}` : `${serviceName} due`;
      
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
        
        remindersCreated++;
      }
    }
    
    return remindersCreated;
  } catch (error) {
    console.error('Error generating reminders for existing maintenance:', error);
    throw error;
  }
}
