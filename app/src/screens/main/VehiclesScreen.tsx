import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { archiveVehicle, listVehiclesByUser } from '../../services/vehicleService';
import type { VehiclesStackParamList } from '../../navigation/VehiclesNavigator';
import { formatMileageWithDate } from '../../utils/vehicle';

type Props = NativeStackScreenProps<VehiclesStackParamList, 'VehicleList'>;

export function VehiclesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { colors } = useAppTheme();

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

  const archiveVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => archiveVehicle(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', userId] });
    },
  });

  return (
    <ScreenContainer
      title="My Garage"
      subtitle="Manage your active vehicles."
    >
      <Pressable
        style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddVehicle')}
      >
        <Text style={[styles.primaryActionButtonLabel, { color: colors.textInverse }]}>Add Vehicle</Text>
      </Pressable>

      {vehiclesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : vehiclesQuery.isError ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {vehiclesQuery.error instanceof Error
            ? vehiclesQuery.error.message
            : 'Unable to load vehicles'}
        </Text>
      ) : (
        <FlatList
          data={vehiclesQuery.data}
          keyExtractor={(item) => item.id ?? `${item.userId}-${item.name}`}
          contentContainerStyle={styles.listContainer}
          refreshing={vehiclesQuery.isRefetching}
          onRefresh={() => void vehiclesQuery.refetch()}
          ListEmptyComponent={
            <View style={[styles.emptyStateContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No vehicles yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap Add Vehicle to create your first car profile.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                if (item.id) {
                  navigation.navigate('VehicleDetail', { vehicleId: item.id });
                }
              }}
            >
              <View style={styles.vehicleHeader}>
                <Text style={[styles.vehicleTitle, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.viewDetailsLabel, { color: colors.primary }]}>View</Text>
              </View>
              <Text style={[styles.vehicleMeta, { color: colors.textMuted }]}>
                {[item.make, item.model, item.year].filter(Boolean).join(' • ') || 'No details yet'}
              </Text>
              <Text style={[styles.vehicleMeta, { color: colors.textMuted }]}>
                Mileage: {formatMileageWithDate(item.currentMileage, item.mileageUpdatedAt)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  primaryActionButton: {
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  listContainer: {
    gap: 10,
    paddingBottom: 16,
  },
  emptyStateContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {},
  vehicleCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  viewDetailsLabel: {
    fontWeight: '600',
  },
  vehicleMeta: {
  },
});
