import { Text } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';

export function MaintenanceScreen() {
  return (
    <ScreenContainer
      title="Maintenance"
      subtitle="Maintenance records list and logging flow will be implemented here."
    >
      <Text>Next: Maintenance CRUD + mileage update behavior.</Text>
    </ScreenContainer>
  );
}
