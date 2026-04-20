import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { archiveVehicle, getVehicleById } from '../../services/vehicleService';
import type { VehiclesStackParamList } from '../../navigation/VehiclesNavigator';
import { formatMileageWithDate } from '../../utils/vehicle';

type Props = NativeStackScreenProps<VehiclesStackParamList, 'VehicleDetail'>;

export function VehicleDetailScreen({ navigation, route }: Props) {
  const { userId } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const { vehicleId } = route.params;

  const vehicleQuery = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => getVehicleById(vehicleId),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => archiveVehicle(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', userId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      navigation.goBack();
    },
  });

  return (
    <ScreenContainer title="Vehicle Detail" subtitle="View details for this vehicle.">
      {vehicleQuery.isLoading ? (
        <Text style={{ color: colors.text }}>Loading vehicle...</Text>
      ) : vehicleQuery.isError ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {vehicleQuery.error instanceof Error
            ? vehicleQuery.error.message
            : 'Unable to load vehicle'}
        </Text>
      ) : !vehicleQuery.data ? (
        <Text style={[styles.error, { color: colors.danger }]}>Vehicle not found.</Text>
      ) : (
        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{vehicleQuery.data.name}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {[vehicleQuery.data.make, vehicleQuery.data.model, vehicleQuery.data.year]
                .filter(Boolean)
                .join(' • ') || 'No make/model/year'}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Mileage:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {formatMileageWithDate(vehicleQuery.data.currentMileage, vehicleQuery.data.mileageUpdatedAt)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>VIN:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {vehicleQuery.data.vin ?? 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Plate:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {vehicleQuery.data.plate ?? 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Oil Type:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {vehicleQuery.data.oilType ?? 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Tire Size:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {vehicleQuery.data.tireSize ?? 'Not set'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Edit Vehicle"
              onPress={() => navigation.navigate('EditVehicle', { vehicleId })}
              variant="primary"
            />

            {archiveMutation.isError ? (
              <Text style={[styles.error, { color: colors.danger }]}>
                {archiveMutation.error instanceof Error
                  ? archiveMutation.error.message
                  : 'Unable to archive vehicle'}
              </Text>
            ) : null}

            <Button
              title={archiveMutation.isPending ? 'Archiving...' : 'Archive Vehicle'}
              variant="danger"
              onPress={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              loading={archiveMutation.isPending}
            />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    fontSize: 16,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    gap: 12,
    marginTop: 'auto',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
