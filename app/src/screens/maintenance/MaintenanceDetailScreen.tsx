import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Button, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceNavigator';
import { getMaintenanceById } from '../../services/maintenanceService';
import { formatMaintenanceType } from '../../utils/maintenance';

type Props = NativeStackScreenProps<MaintenanceStackParamList, 'MaintenanceDetail'>;

export function MaintenanceDetailScreen({ navigation, route }: Props) {
  const { maintenanceId } = route.params;

  const detailQuery = useQuery({
    queryKey: ['maintenance-detail', maintenanceId],
    queryFn: async () => getMaintenanceById(maintenanceId),
  });

  if (detailQuery.isLoading) {
    return (
      <ScreenContainer title="Maintenance Detail" subtitle="Loading record details.">
        <Text>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ScreenContainer title="Maintenance Detail" subtitle="View record details.">
        <Text style={styles.error}>
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Unable to load maintenance record'}
        </Text>
      </ScreenContainer>
    );
  }

  const record = detailQuery.data;

  return (
    <ScreenContainer title="Maintenance Detail" subtitle="View and manage this record.">
      <View style={styles.card}>
        <Text style={styles.title}>{formatMaintenanceType(record.type)}</Text>
        <Text style={styles.meta}>Vehicle ID: {record.vehicleId}</Text>
        <Text style={styles.meta}>Date: {record.date.toLocaleDateString()}</Text>
        <Text style={styles.meta}>Mileage: {record.mileage ?? 'Not set'}</Text>
        <Text style={styles.meta}>Cost: {record.cost ?? 'Not set'}</Text>
        <Text style={styles.meta}>Notes: {record.notes || '—'}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Edit Record"
          onPress={() => navigation.navigate('EditMaintenance', { maintenanceId })}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    color: '#555',
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  error: {
    color: '#b91c1c',
  },
});
