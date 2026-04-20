import type { MaintenanceType } from '../types/maintenance';

export function formatMaintenanceType(type: MaintenanceType): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
