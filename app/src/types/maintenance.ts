export const MAINTENANCE_TYPES = [
  'oil_change',
  'transmission_fluid',
  'timing_belt',
  'air_filter_change',
  'cabin_air_filter_change',
  'tire_rotation',
  'wiper_blade',
  'battery',
  'brake',
  'new_tire',
  'other',
] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];
