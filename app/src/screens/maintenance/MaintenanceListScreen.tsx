import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';

import { Button } from '../../components/Button';
import { FilterDropdown, type FilterOption } from '../../components/FilterDropdown';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ThemeHeaderToggle } from '../../components/ThemeHeaderToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { listMaintenanceByUser } from '../../services/maintenanceService';
import { listVehiclesByUser } from '../../services/vehicleService';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceNavigator';
import { formatMaintenanceType } from '../../utils/maintenance';
import { MAINTENANCE_TYPES } from '../../types/maintenance';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'MaintenanceList'>;

export function MaintenanceListScreen({ navigation }: Props) {
  const { userId } = useAuth();
  const { colors } = useAppTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('MaintenanceSettings')}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
          <ThemeHeaderToggle />
        </View>
      ),
    });
  }, [navigation]);

  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const maintenanceQuery = useQuery({
    queryKey: ['maintenance', userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      return listMaintenanceByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      return listVehiclesByUser(userId);
    },
    enabled: Boolean(userId),
  });

  const vehicleMap = new Map((vehiclesQuery.data ?? []).map((vehicle) => [vehicle.id, vehicle]));

  // Filter and sort options
  const vehicleFilterOptions: FilterOption[] = useMemo(() => {
    const options: FilterOption[] = [{ label: 'All Vehicles', value: 'all' }];
    (vehiclesQuery.data ?? []).forEach((vehicle) => {
      const label = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.name;
      options.push({ label, value: vehicle.id ?? '' });
    });
    return options;
  }, [vehiclesQuery.data]);

  const typeFilterOptions: FilterOption[] = [
    { label: 'All Types', value: 'all' },
    ...MAINTENANCE_TYPES.map((type) => ({
      label: formatMaintenanceType(type),
      value: type,
    })),
  ];

  const sortOptions: FilterOption[] = [
    { label: 'Date (Newest First)', value: 'date_desc' },
    { label: 'Date (Oldest First)', value: 'date_asc' },
    { label: 'Mileage (High to Low)', value: 'mileage_desc' },
    { label: 'Mileage (Low to High)', value: 'mileage_asc' },
    { label: 'Cost (High to Low)', value: 'cost_desc' },
    { label: 'Cost (Low to High)', value: 'cost_asc' },
  ];

  // Apply filters and sorting
  const filteredAndSortedData = useMemo(() => {
    let data = maintenanceQuery.data ?? [];

    // Filter by vehicle
    if (filterVehicle !== 'all') {
      data = data.filter((item) => item.vehicleId === filterVehicle);
    }

    // Filter by type
    if (filterType !== 'all') {
      data = data.filter((item) => item.type === filterType);
    }

    // Sort
    const sorted = [...data];
    switch (sortBy) {
      case 'date_desc':
        sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'date_asc':
        sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case 'mileage_desc':
        sorted.sort((a, b) => (b.mileage ?? 0) - (a.mileage ?? 0));
        break;
      case 'mileage_asc':
        sorted.sort((a, b) => (a.mileage ?? 0) - (b.mileage ?? 0));
        break;
      case 'cost_desc':
        sorted.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
        break;
      case 'cost_asc':
        sorted.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
        break;
    }

    return sorted;
  }, [maintenanceQuery.data, filterVehicle, filterType, sortBy]);

  const hasActiveFilters = filterVehicle !== 'all' || filterType !== 'all';

  const clearFilters = () => {
    setFilterVehicle('all');
    setFilterType('all');
    setSortBy('date_desc');
  };

  // Format helpers
  const formatCost = (cost: number | undefined) => {
    if (!cost) return null;
    return `$${cost.toFixed(2)}`;
  };

  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return null;
    return mileage.toLocaleString('en-US');
  };

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <ScreenContainer
      title="Maintenance"
      subtitle="Track your maintenance records by vehicle and date."
    >
      <View style={styles.headerActions}>
        <Button
          title="Log Maintenance"
          onPress={() => navigation.navigate('AddMaintenance')}
        />
      </View>

      {/* Filter Section */}
      <View style={[styles.filterSection, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <View style={styles.filterHeader}>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filteredAndSortedData.length} {filteredAndSortedData.length === 1 ? 'record' : 'records'}
            {hasActiveFilters && ` (filtered from ${maintenanceQuery.data?.length ?? 0})`}
          </Text>
          {hasActiveFilters && (
            <Pressable
              style={[styles.clearButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.filterGrid}>
          <View style={styles.filterColumn}>
            <FilterDropdown
              label="Vehicle"
              value={filterVehicle}
              options={vehicleFilterOptions}
              onSelect={setFilterVehicle}
            />
          </View>
          <View style={styles.filterColumn}>
            <FilterDropdown
              label="Type"
              value={filterType}
              options={typeFilterOptions}
              onSelect={setFilterType}
            />
          </View>
          <View style={styles.filterColumn}>
            <FilterDropdown
              label="Sort By"
              value={sortBy}
              options={sortOptions}
              onSelect={setSortBy}
            />
          </View>
        </View>
      </View>

      {maintenanceQuery.isLoading ? (
        <Text style={{ color: colors.text }}>Loading maintenance records...</Text>
      ) : maintenanceQuery.isError ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {maintenanceQuery.error instanceof Error
            ? maintenanceQuery.error.message
            : 'Unable to load maintenance records'}
        </Text>
      ) : (
        <FlatList
          data={filteredAndSortedData}
          keyExtractor={(item) => item.id ?? `${item.vehicleId}-${item.createdAt.toISOString()}`}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No maintenance records yet.</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap Log Maintenance to add your first record.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const vehicle = vehicleMap.get(item.vehicleId);
            const vehicleName = (() => {
              if (!vehicle) return 'Unknown vehicle';
              const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
              return makeModel || vehicle.name;
            })();

            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  if (item.id) {
                    navigation.navigate('MaintenanceDetail', { maintenanceId: item.id });
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={[styles.serviceType, { color: colors.text }]}>
                      {formatMaintenanceType(item.type)}
                    </Text>
                    <Text style={[styles.vehicleName, { color: colors.textMuted }]}>{vehicleName}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <Text style={[styles.serviceCost, { color: colors.primary }]}>
                      {formatCost(item.cost) || '—'}
                    </Text>
                    <Pressable
                      style={[styles.editButton, { backgroundColor: colors.surfaceMuted }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (item.id) {
                          navigation.navigate('EditMaintenance', { maintenanceId: item.id });
                        }
                      }}
                    >
                      <Text style={styles.editIcon}>✏️</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>📅 Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(item.date)}</Text>
                  </View>
                  {item.mileage && (
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>📍 Mileage</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{formatMileage(item.mileage)} mi</Text>
                    </View>
                  )}
                </View>

                {item.notes && (
                  <View style={[styles.notesContainer, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.notesLabel, { color: colors.textMuted }]}>💬 Notes</Text>
                    <Text style={[styles.notesText, { color: colors.text }]} numberOfLines={3}>
                      {item.notes}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    marginBottom: 16,
  },
  filterSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterColumn: {
    flex: 1,
    minWidth: 96,
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    flex: 1,
  },
  listContainer: {
    gap: 14,
    paddingBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '500',
  },
  serviceCost: {
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 18,
  },
  cardDivider: {
    height: 1,
    marginVertical: 4,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  notesContainer: {
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
